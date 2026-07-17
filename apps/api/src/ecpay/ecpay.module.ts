import { Module } from "@nestjs/common";
import { EcpayController } from "./ecpay.controller";
import { EcpayPaymentService } from "./ecpay-payment.service";
import { EcpayInvoiceService } from "./ecpay-invoice.service";
import { EcpayLogisticsService } from "./ecpay-logistics.service";

@Module({
  controllers: [EcpayController],
  providers: [EcpayPaymentService, EcpayInvoiceService, EcpayLogisticsService],
  exports: [EcpayPaymentService, EcpayInvoiceService, EcpayLogisticsService],
})
export class EcpayModule {}
