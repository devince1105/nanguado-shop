import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { CartModule } from "../cart/cart.module";
import { EcpayModule } from "../ecpay/ecpay.module";

@Module({
  imports: [CartModule, EcpayModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
