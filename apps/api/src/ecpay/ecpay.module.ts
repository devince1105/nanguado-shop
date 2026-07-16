import { Module } from "@nestjs/common";
import { EcpayController } from "./ecpay.controller";
import { EcpayPaymentService } from "./ecpay-payment.service";
import { EcpayInvoiceService } from "./ecpay-invoice.service";

@Module({
  controllers: [EcpayController],
  providers: [EcpayPaymentService, EcpayInvoiceService],
  exports: [EcpayPaymentService, EcpayInvoiceService],
})
export class EcpayModule {}
