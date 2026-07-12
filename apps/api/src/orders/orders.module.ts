import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { CartModule } from "../cart/cart.module";
import { EcpayModule } from "../ecpay/ecpay.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [CartModule, EcpayModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
