import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Wallet, WalletSchema } from "./schemas/wallet.schema";
import {
  WalletLoadRequest,
  WalletLoadRequestSchema,
} from "./schemas/wallet-load-request.schema";
import {
  WalletTransaction,
  WalletTransactionSchema,
} from "./schemas/wallet-transaction.schema";
import { WalletService } from "./wallet.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletLoadRequest.name, schema: WalletLoadRequestSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
  ],
  providers: [WalletService],
  exports: [WalletService, MongooseModule],
})
export class WalletModule {}
