import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { CategoriesModule } from "../categories/categories.module";
import { OrdersModule } from "../orders/orders.module";
import { AdminProductsController } from "./admin-products.controller";
import { AdminCategoriesController } from "./admin-categories.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminGuard } from "../auth/admin.guard";

@Module({
  imports: [ProductsModule, CategoriesModule, OrdersModule],
  controllers: [
    AdminProductsController,
    AdminCategoriesController,
    AdminOrdersController,
  ],
  providers: [AdminGuard],
})
export class AdminModule {}
