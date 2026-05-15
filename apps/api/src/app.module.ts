import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BbpsModule } from "./modules/bbps/bbps.module";
import { CertificateModule } from "./modules/certificate/certificate.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { DistributorModule } from "./modules/distributor/distributor.module";
import { ExportModule } from "./modules/export/export.module";
import { HealthModule } from "./modules/health/health.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { RetailerModule } from "./modules/retailer/retailer.module";
import { TdsModule } from "./modules/tds/tds.module";
import { UsersModule } from "./modules/users/users.module";
import { WalletModule } from "./modules/wallet/wallet.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", "../../.env"] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>("MONGODB_URI") })
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ connection: { url: config.get<string>("REDIS_URL", "redis://localhost:6379") } })
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    LedgerModule,
    CommissionModule,
    TdsModule,
    BbpsModule,
    ReportsModule,
    RealtimeModule,
    ExportModule,
    NotificationModule,
    CertificateModule,
    AdminModule,
    DistributorModule,
    RetailerModule
  ]
})
export class AppModule {}
