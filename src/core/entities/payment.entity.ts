import { CurrencyEnum, PaymentProviderEnum } from "./enum.entity";

export interface CreateTransactionRequest {
  currency: CurrencyEnum;
  provider: PaymentProviderEnum;
  userId: string;
  bankCode?: string;
  order: {
    code: string;
    amount: number;
  };
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
  };
  redirectUrl: string;
  cancelUrl: string;
}

export interface CreateTransactionResponse {
  transactionCode: string;

  payment: {
    url: string;
    qr: string;
  };
}

export enum TransactionStatus {
  New = "new",
  Closed = "closed",
  Processing = "processing",
  Paid = "paid",
  Failed = "failed",
  Canceled = "canceled",
  OnHold = "on_hold",
  Refunding = "refunding",
  Refunded = "refunded",
}

export interface PaymentEventMessage {
  orderCode: string;
  transCode: string;
  userId: string;
  amount: number;
  status: TransactionStatus;
}
