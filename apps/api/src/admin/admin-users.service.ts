import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getDb, users, orders, carts, reviews } from "@repo/db";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

export type AdminUserQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

const USER_ROLES = ["customer", "admin"] as const;

@Injectable()
export class AdminUsersService {
  /** 會員列表：分頁 + Email/姓名搜尋，附訂單數與已付款消費總額（不回傳 passwordHash） */
  async list(query: AdminUserQuery) {
    const db = getDb();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const conditions: SQL[] = [];
    if (query.search?.trim()) {
      const keyword = `%${query.search.trim()}%`;
      conditions.push(
        or(ilike(users.email, keyword), ilike(users.name, keyword))!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          phone: users.phone,
          address: users.address,
          role: users.role,
          createdAt: users.createdAt,
          orderCount: count(orders.id).mapWith(Number),
          totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${orders.isPaid} THEN ${orders.totalAmount} ELSE 0 END), 0)`.mapWith(
            Number,
          ),
        })
        .from(users)
        .leftJoin(orders, eq(orders.userId, users.id))
        .where(where)
        .groupBy(users.id)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(users).where(where),
    ]);

    return {
      items: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** 單一會員的歷史訂單（給後台展開明細用，不附綠界付款表單） */
  async listOrders(userId: string) {
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`找不到會員：${userId}`);
    }
    const rows = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: { items: true },
      orderBy: desc(orders.createdAt),
    });
    return rows.map((order) => {
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
  }

  /** 調整會員角色；不可調整自己的角色（避免唯一管理員自降權鎖死後台） */
  async updateRole(
    targetUserId: string,
    role: string,
    operatorUserId: string,
  ) {
    if (!USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      throw new BadRequestException(
        `無效的角色：${role}（允許：${USER_ROLES.join(" / ")}）`,
      );
    }
    if (targetUserId === operatorUserId) {
      throw new BadRequestException("不可調整自己的角色");
    }
    const db = getDb();
    const target = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!target) {
      throw new NotFoundException(`找不到會員：${targetUserId}`);
    }
    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });
    return updated;
  }

  /** 刪除會員：解除訂單綁定 (以保留歷史銷售紀錄)，刪除購物車與評價後移除會員 */
  async remove(targetUserId: string, operatorUserId: string) {
    if (targetUserId === operatorUserId) {
      throw new BadRequestException("不可刪除自己的帳號");
    }
    const db = getDb();
    const target = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!target) {
      throw new NotFoundException(`找不到會員：${targetUserId}`);
    }

    // 1. 將訂單中的 userId 解除綁定 (設為 null)，以保留商店營收與歷史銷售明細
    await db
      .update(orders)
      .set({ userId: null })
      .where(eq(orders.userId, targetUserId));

    // 2. 清除該會員的購物車與評價
    await db.delete(reviews).where(eq(reviews.userId, targetUserId));
    await db.delete(carts).where(eq(carts.userId, targetUserId));

    // 3. 刪除會員帳號
    await db.delete(users).where(eq(users.id, targetUserId));
    return { success: true };
  }
}
