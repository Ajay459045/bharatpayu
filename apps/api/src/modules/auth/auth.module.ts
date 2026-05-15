import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import {
  SecuritySetting,
  SecuritySettingSchema,
} from "../admin/schemas/security-setting.schema";
import { BbpsModule } from "../bbps/bbps.module";
import { NotificationModule } from "../notification/notification.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { Device, DeviceSchema } from "./schemas/device.schema";
import { OtpLog, OtpLogSchema } from "./schemas/otp-log.schema";
import { Session, SessionSchema } from "./schemas/session.schema";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    UsersModule,
    BbpsModule,
    NotificationModule,
    PassportModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: OtpLog.name, schema: OtpLogSchema },
      { name: SecuritySetting.name, schema: SecuritySettingSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
