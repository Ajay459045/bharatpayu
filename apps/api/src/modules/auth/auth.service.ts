import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import { Request } from "express";
import { Model, Types } from "mongoose";
import { nanoid } from "nanoid";
import * as nodemailer from "nodemailer";
import { SecuritySetting } from "../admin/schemas/security-setting.schema";
import { NotificationService } from "../notification/notification.service";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/otp.dto";
import { Device } from "./schemas/device.schema";
import { OtpLog } from "./schemas/otp-log.schema";
import { Session } from "./schemas/session.schema";

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(OtpLog.name) private readonly otpModel: Model<OtpLog>,
    @InjectModel(SecuritySetting.name)
    private readonly securitySettingModel: Model<SecuritySetting>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword)
      throw new BadRequestException("Passwords do not match");
    const [existingEmail, existingMobile] = await Promise.all([
      this.users.findByEmail(dto.email),
      this.users.findByMobile(dto.mobile),
    ]);
    const existingEmailId = existingEmail?._id
      ? String(existingEmail._id)
      : undefined;
    const existingMobileId = existingMobile?._id
      ? String(existingMobile._id)
      : undefined;
    const isSamePendingApplication =
      existingEmail &&
      existingEmail.mobile === dto.mobile &&
      existingEmail.emailVerified === false &&
      existingEmail.approvalStatus === "pending" &&
      (!existingMobileId || existingMobileId === existingEmailId);

    if (isSamePendingApplication) {
      const challengeId = await this.issueOtp(
        String(existingEmail._id),
        existingEmail.email,
        "registration",
      );
      await this.notifications.enqueue("retailer.approval.requested", {
        userId: String(existingEmail._id),
        email: existingEmail.email,
        businessName: existingEmail.businessName,
        channels: ["email", "push"],
      });
      return {
        registrationId: String(existingEmail._id),
        challengeId,
        message: "Email OTP sent",
      };
    }

    if (existingEmail)
      throw new BadRequestException("Email is already registered");
    if (existingMobile)
      throw new BadRequestException("Mobile number is already registered");
    const user = await this.users.createOnboarding({
      ...dto,
      passwordHash: await bcrypt.hash(dto.password, 12),
    });
    const challengeId = await this.issueOtp(
      String(user._id),
      user.email,
      "registration",
    );
    await this.notifications.enqueue("retailer.approval.requested", {
      userId: String(user._id),
      email: user.email,
      businessName: user.businessName,
      channels: ["email", "push"],
    });
    return {
      registrationId: String(user._id),
      challengeId,
      message: "Email OTP sent",
    };
  }

  async verifyRegistrationOtp(
    email: string,
    otp: string,
    registrationId?: string,
  ) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException("Invalid email");
    await this.verifyOtpCode(email, otp, "registration");
    const verified = await this.users.markEmailVerified(String(user._id));
    return this.createSession(verified ?? user, undefined, undefined);
  }

  async login(
    email: string,
    password: string,
    device: Record<string, unknown> | undefined,
    request: Request,
  ) {
    this.assertLoginAllowed(email);
    const user = await this.users.findByEmail(email);
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      this.recordFailedLogin(email);
      throw new UnauthorizedException("Invalid email or password");
    }
    const settings = await this.securitySettingModel
      .findOne({ key: "global" })
      .lean();
    const loginOtpEnabled = settings?.loginOtpEnabled === true;
    if (loginOtpEnabled) {
      const challengeId = await this.issueOtp(
        String(user._id),
        user.email,
        "login",
      );
      await this.notifications.enqueue("auth.login.otp.sent", {
        userId: String(user._id),
        email: user.email,
        channels: ["email"],
      });
      return { requiresOtp: true, challengeId, message: "Email OTP sent" };
    }
    return this.createSession(user, device, request);
  }

  async verifyLoginOtp(
    email: string,
    otp: string,
    challengeId: string | undefined,
    device: Record<string, unknown> | undefined,
    request: Request,
  ) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException("Invalid email");
    await this.verifyOtpCode(email, otp, "login", challengeId);
    return this.createSession(user, device, request);
  }

  async verifyOtp(
    mobile: string,
    device: Record<string, unknown> | undefined,
    request: Request,
  ) {
    const user = await this.users.upsertOtpUser(mobile);
    return this.createSession(user, device, request);
  }

  private async createSession(
    user: any,
    device: Record<string, unknown> | undefined,
    request: Request | undefined,
  ) {
    const userId = new Types.ObjectId(String(user._id));
    const deviceDoc = await this.deviceModel.create({
      userId,
      userAgent: String(
        device?.userAgent ?? request?.headers["user-agent"] ?? "unknown",
      ),
      timezone: String(device?.timezone ?? ""),
      ip: request?.ip ?? "",
      location: device?.location,
      fingerprint: device?.fingerprint,
    });
    const refreshToken = nanoid(64);
    await this.sessionModel.create({
      userId,
      deviceId: new Types.ObjectId(String(deviceDoc._id)),
      refreshTokenHash: await bcrypt.hash(refreshToken, 12),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    const payload = {
      sub: String(user._id),
      role: user.role,
      email: user.email,
    };
    return {
      user: {
        id: user._id,
        role: user.role,
        mobile: user.mobile,
        email: user.email,
        retailerCode: user.retailerCode,
        name: user.name,
        approvalStatus: user.approvalStatus,
        emailVerified: user.emailVerified,
        kycStatus: user.kycStatus,
      },
      accessToken: await this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: "8h",
      }),
      refreshToken,
    };
  }

  private async issueOtp(
    userId: string,
    email: string,
    type: "registration" | "login",
  ) {
    const recent = await this.otpModel.findOne({
      email: email.toLowerCase(),
      type,
      verified: false,
      lastSentAt: { $gt: new Date(Date.now() - 60_000) },
    });
    if (recent)
      throw new HttpException(
        "Please wait before requesting another OTP",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const challengeId = nanoid(24);
    await this.otpModel.create({
      userId: new Types.ObjectId(userId),
      email: email.toLowerCase(),
      otp: await bcrypt.hash(otp, 12),
      type,
      challengeId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      lastSentAt: new Date(),
    });
    await this.sendEmailOtp(email, otp, type);
    await this.notifications.enqueue(`email.${type}.otp`, {
      userId,
      email,
      otp,
      channels: ["email"],
    });
    return challengeId;
  }

  private async sendEmailOtp(
    email: string,
    otp: string,
    type: "registration" | "login",
  ) {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    if (!host || !user || !pass || user === "replace" || pass === "replace")
      return;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>("SMTP_PORT", "465")),
      secure: this.config.get<string>("SMTP_SECURE", "true") !== "false",
      connectionTimeout: Number(
        this.config.get<string>("SMTP_CONNECTION_TIMEOUT", "8000"),
      ),
      greetingTimeout: Number(
        this.config.get<string>("SMTP_GREETING_TIMEOUT", "8000"),
      ),
      socketTimeout: Number(
        this.config.get<string>("SMTP_SOCKET_TIMEOUT", "12000"),
      ),
      auth: { user, pass },
    });

    const subject =
      type === "registration"
        ? "Verify your BharatPayU registration"
        : "BharatPayU login OTP";
    await transporter.sendMail({
      from: this.config.get<string>("SMTP_FROM", `BharatPayU <${user}>`),
      to: email,
      subject,
      text: `Your BharatPayU ${type} OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#03091f;color:#f8fafc;padding:28px">
          <div style="max-width:520px;margin:auto;background:#071238;border:1px solid #1d4ed8;border-radius:12px;padding:28px">
            <h2 style="margin:0 0 12px;color:#ffffff">BharatPayU Verification</h2>
            <p style="color:#cbd5e1">Use this OTP to continue your ${type} flow.</p>
            <div style="font-size:32px;letter-spacing:8px;font-weight:800;color:#60a5fa;margin:24px 0">${otp}</div>
            <p style="color:#94a3b8;font-size:13px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        </div>
      `,
    });
  }

  private async verifyOtpCode(
    email: string,
    otp: string,
    type: "registration" | "login",
    challengeId?: string,
  ) {
    const query: Record<string, unknown> = {
      email: email.toLowerCase(),
      type,
      verified: false,
      expiresAt: { $gt: new Date() },
    };
    if (challengeId) query.challengeId = challengeId;
    const log = await this.otpModel.findOne(query).sort({ createdAt: -1 });
    if (!log || !(await bcrypt.compare(otp, log.otp)))
      throw new UnauthorizedException("Invalid or expired OTP");
    log.verified = true;
    await log.save();
  }

  private assertLoginAllowed(email: string) {
    const state = this.loginAttempts.get(email.toLowerCase());
    if (state && state.count >= 5 && state.resetAt > Date.now()) {
      throw new HttpException(
        "Too many login attempts. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedLogin(email: string) {
    const key = email.toLowerCase();
    const current = this.loginAttempts.get(key);
    if (!current || current.resetAt < Date.now()) {
      this.loginAttempts.set(key, {
        count: 1,
        resetAt: Date.now() + 15 * 60_000,
      });
      return;
    }
    this.loginAttempts.set(key, {
      count: current.count + 1,
      resetAt: current.resetAt,
    });
  }
}
