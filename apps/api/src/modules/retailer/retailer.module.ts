import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Device, DeviceSchema } from "../auth/schemas/device.schema";
import { Session, SessionSchema } from "../auth/schemas/session.schema";
import { BbpsModule } from "../bbps/bbps.module";
import { BbpsBiller, BbpsBillerSchema } from "../bbps/schemas/bbps-biller.schema";
import {
  BbpsCategory,
  BbpsCategorySchema,
} from "../bbps/schemas/bbps-category.schema";
import {
  BbpsTransaction,
  BbpsTransactionSchema,
} from "../bbps/schemas/bbps-transaction.schema";
import { LedgerModule } from "../ledger/ledger.module";
import { Ledger, LedgerSchema } from "../ledger/schemas/ledger.schema";
import { NotificationModule } from "../notification/notification.module";
import {
  Notification,
  NotificationSchema,
} from "../notification/schemas/notification.schema";
import { TdsReport, TdsReportSchema } from "../tds/schemas/tds-report.schema";
import { TdsModule } from "../tds/tds.module";
import {
  DocumentRecord,
  DocumentRecordSchema,
} from "../users/schemas/document.schema";
import {
  LocationRecord,
  LocationRecordSchema,
} from "../users/schemas/location.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { UsersModule } from "../users/users.module";
import {
  WalletTransaction,
  WalletTransactionSchema,
} from "../wallet/schemas/wallet-transaction.schema";
import {
  WalletLoadRequest,
  WalletLoadRequestSchema,
} from "../wallet/schemas/wallet-load-request.schema";
import { Wallet, WalletSchema } from "../wallet/schemas/wallet.schema";
import { WalletModule } from "../wallet/wallet.module";
import { RetailerController } from "./retailer.controller";
import { RetailerService } from "./retailer.service";

@Module({
  imports: [
    UsersModule,
    WalletModule,
    LedgerModule,
    TdsModule,
    NotificationModule,
    BbpsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DocumentRecord.name, schema: DocumentRecordSchema },
      { name: LocationRecord.name, schema: LocationRecordSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletLoadRequest.name, schema: WalletLoadRequestSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: BbpsTransaction.name, schema: BbpsTransactionSchema },
      { name: BbpsCategory.name, schema: BbpsCategorySchema },
      { name: BbpsBiller.name, schema: BbpsBillerSchema },
      { name: Ledger.name, schema: LedgerSchema },
      { name: TdsReport.name, schema: TdsReportSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [RetailerController],
  providers: [RetailerService],
})
export class RetailerModule {}
