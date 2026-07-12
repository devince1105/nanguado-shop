import { Module } from "@nestjs/common";
import { EcpayController } from "./ecpay.controller";
import { EcpayPaymentService } from "./ecpay-payment.service";

@Module({
  controllers: [EcpayController],
  providers: [EcpayPaymentService],
  exports: [EcpayPaymentService],
})
export class EcpayModule {}
