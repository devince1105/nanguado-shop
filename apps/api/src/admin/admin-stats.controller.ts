import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { getDb, orders, products, users } from "@repo/db";
import { and, count, eq, gte, lte, sum } from "drizzle-orm";

@Controller("admin/stats")
@UseGuards(AdminGuard)
export class AdminStatsController {
  @Get()
  async getStats() {
    const db = getDb();
    const now = new Date();
    const tzOffset = 8 * 60 * 60 * 1000; // Asia/Taipei offset (UTC+8)

    // Calculate start of today in Asia/Taipei timezone
    const taipeiTime = now.getTime() + tzOffset;
    const startOfToday = new Date(
      Math.floor(taipeiTime / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - tzOffset
    );

    // Calculate start of 7 days ago (inclusive of today)
    const startOf7DaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

    // 1. Today's order count (今日訂單數)
    const [todayOrdersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(gte(orders.createdAt, startOfToday));
    const todayOrderCount = todayOrdersResult?.count ?? 0;

    // 2. Today's revenue (今日營收)
    const [todayRevenueResult] = await db
      .select({ sum: sum(orders.totalAmount) })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startOfToday),
          eq(orders.isPaid, true)
        )
      );
    const todayRevenue = Number(todayRevenueResult?.sum ?? 0);

    // 3. Low stock count (低庫存警示數，庫存 <= 10)
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          lte(products.stock, 10)
        )
      );
    const lowStockCount = lowStockResult?.count ?? 0;

    // 4. Cumulative Stats (總體統計)
    // 總營收 (Total Sales)
    const [totalSalesResult] = await db
      .select({ sum: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.isPaid, true));
    const totalSales = Number(totalSalesResult?.sum ?? 0);

    // 總訂單數
    const [totalOrdersResult] = await db
      .select({ count: count() })
      .from(orders);
    const totalOrders = totalOrdersResult?.count ?? 0;

    // 總會員數 (role = 'customer')
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "customer"));
    const totalUsers = totalUsersResult?.count ?? 0;

    // 5. Recent 5 orders (最新訂單)
    const recentOrders = await db.query.orders.findMany({
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      limit: 5,
      with: {
        items: true,
      },
    });

    // 6. Top 5 low stock products (庫存最少的前 5 項商品，且庫存 <= 10)
    const lowStockProducts = await db.query.products.findMany({
      where: and(
        eq(products.isActive, true),
        lte(products.stock, 10)
      ),
      orderBy: (products, { asc }) => [asc(products.stock)],
      limit: 5,
    });

    // 7. Sales trend for the last 7 days (過去 7 天銷售趨勢，含今日)
    const trendOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.isPaid, true),
        gte(orders.createdAt, startOf7DaysAgo)
      ),
    });

    // Initialize 7-day trend array in Taipei date strings
    const trendMap = new Map<string, { date: string; revenue: number; orderCount: number }>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = new Date(date.getTime() + tzOffset).toISOString().split("T")[0];
      trendMap.set(dateStr, { date: dateStr, revenue: 0, orderCount: 0 });
    }

    // Populate trend data from orders
    for (const order of trendOrders) {
      const orderDateStr = new Date(order.createdAt.getTime() + tzOffset)
        .toISOString()
        .split("T")[0];
      if (trendMap.has(orderDateStr)) {
        const current = trendMap.get(orderDateStr)!;
        current.revenue += order.totalAmount;
        current.orderCount += 1;
      }
    }

    const salesTrend = Array.from(trendMap.values());

    return {
      todayOrderCount,
      todayRevenue,
      lowStockCount,
      totalSales,
      totalOrders,
      totalUsers,
      recentOrders,
      lowStockProducts,
      salesTrend,
    };
  }
}
