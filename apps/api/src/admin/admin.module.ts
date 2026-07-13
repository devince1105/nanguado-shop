import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { CategoriesModule } from "../categories/categories.module";
import { OrdersModule } from "../orders/orders.module";
import { AdminProductsController } from "./admin-products.controller";
import { AdminCategoriesController } from "./admin-categories.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminGuard } from "../auth/admin.guard";
import { AdminStatsController } from "./admin-stats.controller";

@Module({
  imports: [ProductsModule, CategoriesModule, OrdersModule],
  controllers: [
    AdminProductsController,
    AdminCategoriesController,
    AdminOrdersController,
    AdminUsersController,
    AdminStatsController,
  ],
  providers: [AdminGuard, AdminUsersService],
})
export class AdminModule {}

