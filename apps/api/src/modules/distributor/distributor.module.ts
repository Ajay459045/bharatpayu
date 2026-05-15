import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  ActivityLog,
  ActivityLogSchema,
} from "../admin/schemas/activity-log.schema";
import {
  BbpsTransaction,
  BbpsTransactionSchema,
} from "../bbps/schemas/bbps-transaction.schema";
import { CommissionModule } from "../commission/commission.module";
import { LedgerModule } from "../ledger/ledger.module";
import { Ledger, LedgerSchema } from "../ledger/schemas/ledger.schema";
import { NotificationModule } from "../notification/notification.module";
import { User, UserSchema } from "../users/schemas/user.schema";
import { UsersModule } from "../users/users.module";
import { Wallet, WalletSchema } from "../wallet/schemas/wallet.schema";
import { WalletModule } from "../wallet/wallet.module";
import { DistributorController } from "./distributor.controller";
import { DistributorService } from "./distributor.service";

@Module({
  imports: [
    UsersModule,
    CommissionModule,
    WalletModule,
    LedgerModule,
    NotificationModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Ledger.name, schema: LedgerSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: BbpsTransaction.name, schema: BbpsTransactionSchema },
    ]),
  ],
  controllers: [DistributorController],
  providers: [DistributorService],
})
export class DistributorModule {}
