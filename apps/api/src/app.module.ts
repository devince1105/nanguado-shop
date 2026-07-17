import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
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
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60000,
          limit: 60,
        },
        {
          name: "auth",
          ttl: 60000,
          limit: 5,
        },
      ],
      errorMessage: "嘗試次數過多，請稍後再試",
    }),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
