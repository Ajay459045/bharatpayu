import { BullModule } from "@nestjs/bullmq";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommissionModule } from "../commission/commission.module";
import { LedgerModule } from "../ledger/ledger.module";
import { NotificationModule } from "../notification/notification.module";
import { TdsModule } from "../tds/tds.module";
import { UsersModule } from "../users/users.module";
import { WalletModule } from "../wallet/wallet.module";
import { BbpsController } from "./bbps.controller";
import { BbpsService } from "./bbps.service";
import { DigiSevaClient } from "./digiseva.client";
import {
  AdminSettlementRequest,
  AdminSettlementRequestSchema,
} from "./schemas/admin-settlement-request.schema";
import { ApiLog, ApiLogSchema } from "./schemas/api-log.schema";
import { BbpsBiller, BbpsBillerSchema } from "./schemas/bbps-biller.schema";
import {
  BbpsBillerDetail,
  BbpsBillerDetailSchema,
} from "./schemas/bbps-biller-detail.schema";
import {
  BbpsCategory,
  BbpsCategorySchema,
} from "./schemas/bbps-category.schema";
import {
  BbpsTransaction,
  BbpsTransactionSchema,
} from "./schemas/bbps-transaction.schema";
import {
  ServiceTiming,
  ServiceTimingSchema,
} from "./schemas/service-timing.schema";
import {
  TransactionLog,
  TransactionLogSchema,
} from "./schemas/transaction-log.schema";

@Module({
  imports: [
    HttpModule,
    WalletModule,
    LedgerModule,
    CommissionModule,
    TdsModule,
    UsersModule,
    NotificationModule,
    BullModule.registerQueue({ name: "reconciliation" }),
    MongooseModule.forFeature([
      { name: BbpsTransaction.name, schema: BbpsTransactionSchema },
      {
        name: AdminSettlementRequest.name,
        schema: AdminSettlementRequestSchema,
      },
      { name: BbpsCategory.name, schema: BbpsCategorySchema },
      { name: BbpsBiller.name, schema: BbpsBillerSchema },
      { name: BbpsBillerDetail.name, schema: BbpsBillerDetailSchema },
      { name: ApiLog.name, schema: ApiLogSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
      { name: ServiceTiming.name, schema: ServiceTimingSchema },
    ]),
  ],
  controllers: [BbpsController],
  providers: [BbpsService, DigiSevaClient],
  exports: [BbpsService, MongooseModule],
})
export class BbpsModule {}
