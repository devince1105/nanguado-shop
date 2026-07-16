import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  getDb,
  orders,
  orderItems,
  products,
  type SelectedVariant,
} from "@repo/db";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { CartService } from "../cart/cart.service";
import { EcpayPaymentService } from "../ecpay/ecpay-payment.service";
import { EcpayInvoiceService } from "../ecpay/ecpay-invoice.service";

/** 滿 NT$1,000 免運，未滿收 NT$60 */
const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_FEE = 60;

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function calcShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export type CreateOrderDto = {
  /** 會員 ID */
  userId?: string;
  /** 提供 sessionId 時，從該購物車取得下單商品並於成功後清空 */
  sessionId?: string;
  /** 或直接指定商品（直接購買） */
  items?: {
    productId: string;
    quantity: number;
    selectedVariant?: SelectedVariant | null;
  }[];
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientAddress?: string;
  shippingType?: "home" | "cvs";
  cvsStoreId?: string;
  cvsStoreName?: string;
  cvsStoreAddress?: string;
  cvsSubType?: string;
  invoiceType?: "individual" | "carrier" | "company" | "donate";
  carrierType?: "member" | "mobile" | "natural";
  carrierNum?: string;
  companyTaxId?: string;
  companyTitle?: string;
  donationCode?: string;
};

/** 產生綠界 MerchantTradeNo：NGD + 13 位時間戳 + 4 位隨機數（共 20 字元） */
function generateMerchantTradeNo() {
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `NGD${Date.now()}${rand}`;
}

export function validateTaxId(taxId: string): boolean {
  if (!/^\d{8}$/.test(taxId)) return false;
  const multipliers = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  let hasSeven = false;
  for (let i = 0; i < 8; i++) {
    const num = parseInt(taxId[i]);
    const product = num * multipliers[i];
    sum += Math.floor(product / 10) + (product % 10);
    if (i === 6 && num === 7) hasSeven = true;
  }
  if (sum % 5 === 0) return true;
  if (hasSeven && (sum - 9) % 5 === 0) return true;
  return false;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly cartService: CartService,
    private readonly ecpayPaymentService: EcpayPaymentService,
    private readonly ecpayInvoiceService: EcpayInvoiceService,
  ) {}

  async create(dto: CreateOrderDto) {
    const shippingType = dto.shippingType || "home";
    const requiredFields = ["recipientName", "recipientPhone", "recipientEmail"] as const;
    for (const field of requiredFields) {
      if (!dto?.[field]) {
        throw new BadRequestException(`缺少必填欄位：${field}`);
      }
    }

    // 發票校驗與格式校驗
    const invoiceType = dto.invoiceType || "individual";
    if (invoiceType === "carrier") {
      if (dto.carrierType === "mobile") {
        if (!dto.carrierNum || !/^\/[0-9A-Z.+-]{7}$/.test(dto.carrierNum)) {
          throw new BadRequestException("手機條碼格式錯誤，應為 / 開頭加 7 碼英數或符號");
        }
      } else if (dto.carrierType === "natural") {
        if (!dto.carrierNum || !/^[A-Z]{2}\d{14}$/.test(dto.carrierNum)) {
          throw new BadRequestException("自然人憑證格式錯誤，應為 2 碼大寫英文加 14 碼數字");
        }
      }
    } else if (invoiceType === "company") {
      if (!dto.companyTaxId || !validateTaxId(dto.companyTaxId)) {
        throw new BadRequestException("統一編號格式或檢查碼不正確");
      }
      if (!dto.companyTitle) {
        throw new BadRequestException("公司發票缺少公司抬頭");
      }
    } else if (invoiceType === "donate") {
      if (!dto.donationCode || !/^\d{3,7}$/.test(dto.donationCode)) {
        throw new BadRequestException("愛心碼格式錯誤，應為 3 至 7 碼數字");
      }
    }

    if (shippingType === "home") {
      if (!dto?.recipientAddress) {
        throw new BadRequestException("缺少必填欄位：recipientAddress");
      }
    } else if (shippingType === "cvs") {
      if (!dto?.cvsStoreId || !dto?.cvsStoreName || !dto?.cvsStoreAddress) {
        throw new BadRequestException("缺少超商門市資訊 (cvsStoreId, cvsStoreName, cvsStoreAddress)");
      }
    } else {
      throw new BadRequestException(`不支援的配送方式：${shippingType}`);
    }

    const db = getDb();

    // 取得下單商品清單（購物車或直接購買）
    let lineItems: {
      productId: string;
      quantity: number;
      selectedVariant: SelectedVariant | null;
    }[];

    if (dto.items?.length) {
      lineItems = dto.items.map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, item.quantity),
        selectedVariant: item.selectedVariant ?? null,
      }));
    } else if (dto.userId || dto.sessionId) {
      const cart = await this.cartService.getCart(dto.sessionId || "", dto.userId);
      if (!cart.items.length) {
        throw new BadRequestException("購物車是空的");
      }
      lineItems = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant ?? null,
      }));
    } else {
      throw new BadRequestException("請提供 userId、sessionId 或 items");
    }

    // 讀取商品並驗證庫存
    const productIds = [...new Set(lineItems.map((item) => item.productId))];
    const productRows = await db.query.products.findMany({
      where: inArray(products.id, productIds),
    });
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    for (const item of lineItems) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        throw new NotFoundException(`找不到商品：${item.productId}`);
      }

      let maxStock = product.stock;
      const hasVariantStock = product.variantStock && Object.keys(product.variantStock).length > 0;
      if (hasVariantStock && product.variants && product.variants.length > 0 && item.selectedVariant) {
        const key = product.variants
          .map((v: any) => item.selectedVariant?.[v.name] || "")
          .join(" / ");
        maxStock = (product.variantStock as any)?.[key] ?? 0;
      }

      if (item.quantity > maxStock) {
        throw new BadRequestException(
          `庫存不足：「${product.name}」目前僅剩 ${maxStock} 件`,
        );
      }
    }

    const subtotal = lineItems.reduce(
      (sum, item) =>
        sum + item.quantity * productMap.get(item.productId)!.price,
      0,
    );
    const shippingFee = calcShippingFee(subtotal);
    const totalAmount = subtotal + shippingFee;

    // 建立訂單與明細
    const [order] = await db
      .insert(orders)
      .values({
        merchantTradeNo: generateMerchantTradeNo(),
        userId: dto.userId || null,
        totalAmount,
        status: "pending",
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        recipientEmail: dto.recipientEmail,
        recipientAddress: shippingType === "cvs"
          ? `${dto.cvsStoreName} (${dto.cvsStoreId}) - ${dto.cvsStoreAddress}`
          : dto.recipientAddress || "",
        shippingType,
        cvsStoreId: dto.cvsStoreId || null,
        cvsStoreName: dto.cvsStoreName || null,
        cvsStoreAddress: dto.cvsStoreAddress || null,
        cvsSubType: dto.cvsSubType || null,
        // 發票欄位
        invoiceType,
        carrierType: dto.carrierType || null,
        carrierNum: dto.carrierNum || null,
        companyTaxId: dto.companyTaxId || null,
        companyTitle: dto.companyTitle || null,
        donationCode: dto.donationCode || null,
        invoiceStatus: "unissued",
      })
      .returning();

    await db.insert(orderItems).values(
      lineItems.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          orderId: order.id,
          productId: item.productId,
          productName: product.name,
          productImage: product.images[0] ?? null,
          unitPrice: product.price,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant,
        };
      }),
    );

    // 從購物車下單成功後清空購物車
    if (!dto.items?.length && (dto.userId || dto.sessionId)) {
      await this.cartService.clearCart(dto.sessionId || "", dto.userId);
    }

    const created = await this.getById(order.id);

    // 產生綠界付款表單，前端以隱藏 form submit 到綠界收銀台
    const payment = this.ecpayPaymentService.buildCheckoutForm(
      created,
      created.items,
    );

    return { ...created, payment };
  }

  async getById(id: string) {
    const db = getDb();
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`找不到訂單：${id}`);
    }
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    return {
      ...order,
      subtotal,
      shippingFee: Math.max(0, order.totalAmount - subtotal),
    };
  }

  async getByUserId(userId: string) {
    const db = getDb();
    const rows = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: { items: true },
      orderBy: (order, { desc }) => desc(order.createdAt),
    });

    return rows.map((order) => {
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      
      const enhancedOrder = {
        ...order,
        subtotal,
        shippingFee: Math.max(0, order.totalAmount - subtotal),
      };

      if (enhancedOrder.status === "pending") {
        const payment = this.ecpayPaymentService.buildCheckoutForm(
          enhancedOrder as any,
          enhancedOrder.items,
        );
        return { ...enhancedOrder, payment };
      }

      return enhancedOrder;
    });
  }

  // ---------- 後台管理 ----------

  /** 後台訂單列表：分頁 + 狀態篩選 */
  async adminList(query: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const db = getDb();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const conditions: SQL[] = [];
    if (query.status) {
      if (!ORDER_STATUSES.includes(query.status as OrderStatus)) {
        throw new BadRequestException(`無效的訂單狀態：${query.status}`);
      }
      conditions.push(eq(orders.status, query.status));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.query.orders.findMany({
        where,
        with: { items: true },
        orderBy: desc(orders.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ total: count() }).from(orders).where(where),
    ]);

    const items = rows.map((order) => {
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      return {
        ...order,
        subtotal,
        shippingFee: Math.max(0, order.totalAmount - subtotal),
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** 更新訂單狀態；標記為 paid 時同步補上付款註記 */
  async updateStatus(id: string, status: string) {
    if (!ORDER_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(
        `無效的訂單狀態：${status}（允許：${ORDER_STATUSES.join(" / ")}）`,
      );
    }

    const db = getDb();
    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!existing) {
      throw new NotFoundException(`找不到訂單：${id}`);
    }

    await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === "paid" &&
          !existing.isPaid && {
            isPaid: true,
            paidAt: new Date(),
            paymentType: existing.paymentType ?? "Manual",
          }),
      })
      .where(eq(orders.id, id));

    return this.getById(id);
  }

  async repay(orderId: string, userId?: string) {
    const db = getDb();
    
    // 讀取該筆交易的訂單
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });

    if (!orderRecord) {
      throw new NotFoundException("找不到該訂單");
    }

    if (userId && orderRecord.userId !== userId) {
      throw new BadRequestException("無權操作此訂單");
    }

    if (orderRecord.status !== "pending") {
      throw new BadRequestException("只有待付款的訂單才能重新付款");
    }

    // 產生全新的綠界 MerchantTradeNo 以防綠界重複交易錯誤
    const newMerchantTradeNo = generateMerchantTradeNo();

    // 更新資料庫中的 MerchantTradeNo
    await db
      .update(orders)
      .set({
        merchantTradeNo: newMerchantTradeNo,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    const updatedOrder = {
      ...orderRecord,
      merchantTradeNo: newMerchantTradeNo,
    };

    // 重新產生綠界付款表單參數
    const payment = this.ecpayPaymentService.buildCheckoutForm(
      updatedOrder as any,
      orderRecord.items,
    );

    return {
      success: true,
      payment,
    };
  }

  async voidInvoice(id: string) {
    const db = getDb();
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!order) {
      throw new NotFoundException(`找不到該訂單：${id}`);
    }
    if (order.invoiceStatus !== "issued" || !order.invoiceNo || !order.invoiceDate) {
      throw new BadRequestException("此訂單無已開立之電子發票或缺少發票日期，無法作廢");
    }

    const result = await this.ecpayInvoiceService.voidInvoice(order.invoiceNo, order.invoiceDate);
    if (!result.success) {
      throw new BadRequestException(`發票作廢失敗：${result.message}`);
    }

    await db
      .update(orders)
      .set({
        invoiceStatus: "voided",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    return this.getById(id);
  }
}
