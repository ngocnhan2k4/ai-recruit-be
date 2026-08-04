import {
  CreateTransactionRequest,
  CreateTransactionResponse,
} from "../entities/payment.entity";

export abstract class IPaymentService {
  abstract createTransaction(
    request: CreateTransactionRequest,
  ): Promise<CreateTransactionResponse>;
}
