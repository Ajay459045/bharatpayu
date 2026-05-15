import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NotificationModule } from "../notification/notification.module";
import { ReportsModule } from "../reports/reports.module";
import { UsersModule } from "../users/users.module";
import { ApiLog, ApiLogSchema } from "../bbps/schemas/api-log.schema";
import {
  AdminSettlementRequest,
  AdminSettlementRequestSchema,
} from "../bbps/schemas/admin-settlement-request.schema";
import {
  BbpsTransaction,
  BbpsTransactionSchema,
} from "../bbps/schemas/bbps-transaction.schema";
import { CommissionModule } from "../commission/commission.module";
import { LedgerModule } from "../ledger/ledger.module";
import { Ledger, LedgerSchema } from "../ledger/schemas/ledger.schema";
import { TdsModule } from "../tds/tds.module";
import { WalletModule } from "../wallet/wallet.module";
import { Wallet, WalletSchema } from "../wallet/schemas/wallet.schema";
import {
  WalletLoadRequest,
  WalletLoadRequestSchema,
} from "../wallet/schemas/wallet-load-request.schema";
import { AdminController } from "./admin.controller";
import { ActivityLog, ActivityLogSchema } from "./schemas/activity-log.schema";
import { Role, RoleSchema } from "./schemas/role.schema";
import {
  SecuritySetting,
  SecuritySettingSchema,
} from "./schemas/security-setting.schema";

@Module({
  imports: [
    ReportsModule,
    UsersModule,
    NotificationModule,
    WalletModule,
    CommissionModule,
    LedgerModule,
    TdsModule,
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: SecuritySetting.name, schema: SecuritySettingSchema },
      { name: BbpsTransaction.name, schema: BbpsTransactionSchema },
      {
        name: AdminSettlementRequest.name,
        schema: AdminSettlementRequestSchema,
      },
      { name: ApiLog.name, schema: ApiLogSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Ledger.name, schema: LedgerSchema },
      { name: WalletLoadRequest.name, schema: WalletLoadRequestSchema },
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
