import { Module } from "@nestjs/common";
import { ProductsModule } from "./products/products.module";
import { CategoriesModule } from "./categories/categories.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { EcpayModule } from "./ecpay/ecpay.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { MediaModule } from "./media/media.module";
import { PagesModule } from "./pages/pages.module";
import { SettingsModule } from "./settings/settings.module";
import { BannersModule } from "./banners/banners.module";
import { MailModule } from "./mail/mail.module";

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    EcpayModule,
    AuthModule,
    AdminModule,
    ReviewsModule,
    MediaModule,
    PagesModule,
    SettingsModule,
    BannersModule,
    MailModule,
  ],
})
export class AppModule {}
