import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PaymentService } from "./payment.service";
import { IPaymentService } from "@/core/abstracts/payment-services.abstract";

@Module({
  imports: [HttpModule.register({})],
  providers: [
    {
      provide: IPaymentService,
      useClass: PaymentService,
    },
  ],
  exports: [IPaymentService],
})
export class PaymentServicesModule {}
