import { Module } from "@nestjs/common";
import { ProductsModule } from "./products/products.module";
import { CategoriesModule } from "./categories/categories.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { EcpayModule } from "./ecpay/ecpay.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    EcpayModule,
    AuthModule,
    AdminModule,
  ],
})
export class AppModule {}
