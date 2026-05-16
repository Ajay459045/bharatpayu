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
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { Request } from "express";
import { Model, Types } from "mongoose";
import { customAlphabet, nanoid } from "nanoid";
import * as nodemailer from "nodemailer";
import * as qrcode from "qrcode";
import * as speakeasy from "speakeasy";
import { ActivityLog } from "../admin/schemas/activity-log.schema";
import { SecuritySetting } from "../admin/schemas/security-setting.schema";
import { BbpsService } from "../bbps/bbps.service";
import { NotificationService } from "../notification/notification.service";
import { UsersService } from "../users/users.service";
import {
  ChangePasswordDto,
  RegisterDto,
  ResetPasswordDto,
} from "./dto/otp.dto";
import { Device } from "./schemas/device.schema";
import { OtpLog } from "./schemas/otp-log.schema";
import { Session } from "./schemas/session.schema";

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly twoFactorAttempts = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly setupChallenges = new Map<
    string,
    { userId: string; secret: string; expiresAt: number }
  >();

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
    private readonly bbps: BbpsService,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(OtpLog.name) private readonly otpModel: Model<OtpLog>,
    @InjectModel(SecuritySetting.name)
    private readonly securitySettingModel: Model<SecuritySetting>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
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

  async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return {
        message: "If the email exists, a password reset OTP has been sent.",
      };
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const challengeId = nanoid(24);
    await this.otpModel.create({
      userId: new Types.ObjectId(String(user._id)),
      email: user.email.toLowerCase(),
      otp: await bcrypt.hash(otp, 12),
      type: "password_reset",
      challengeId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      lastSentAt: new Date(),
    });
    const emailSent = await this.sendEmailOtp(
      user.email,
      otp,
      "password_reset",
    );
    await this.notifications.enqueue("email.password_reset.otp", {
      userId: String(user._id),
      email: user.email,
      otp,
      channels: ["email"],
    });
    return {
      challengeId,
      message: emailSent
        ? "Password reset OTP sent"
        : "SMTP is not configured. Use testing OTP shown on screen.",
      devOtp:
        emailSent || this.config.get<string>("NODE_ENV") === "production"
          ? undefined
          : otp,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException("Invalid or expired OTP");
    await this.verifyOtpCode(
      dto.email,
      dto.otp,
      "password_reset",
      dto.challengeId,
    );
    user.passwordHash = await bcrypt.hash(dto.password, 12);
    await user.save();
    await this.sessionModel.updateMany(
      { userId: new Types.ObjectId(String(user._id)) },
      { revokedAt: new Date() },
    );
    return { message: "Password reset successfully. Please login again." };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }
    const account = await this.users.findDocumentById(userId);
    if (!account) throw new UnauthorizedException("Invalid session");
    if (
      !account.passwordHash ||
      !(await bcrypt.compare(dto.currentPassword, account.passwordHash))
    ) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    account.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await account.save();
    return { message: "Password changed successfully." };
  }

  async twoFactorStatus(userId: string) {
    const user = await this.users.findDocumentById(userId);
    if (!user) throw new UnauthorizedException("Invalid session");
    return {
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorVerifiedAt: user.twoFactorVerifiedAt,
      backupCodesRemaining: (user.backupCodes ?? []).filter(
        (code) => !code.usedAt,
      ).length,
      adminTwoFactorEnforced: this.isAdminTwoFactorEnforced(user),
    };
  }

  async setupTwoFactor(userIdOrToken: string, request?: Request) {
    const user = await this.resolveTwoFactorSetupUser(userIdOrToken);
    const secret = speakeasy.generateSecret({
      length: 32,
      name: `${this.config.get<string>("TOTP_ISSUER", "BharatPayU")}:${user.email}`,
      issuer: this.config.get<string>("TOTP_ISSUER", "BharatPayU"),
    });
    if (!secret.otpauth_url || !secret.base32) {
      throw new BadRequestException("Could not create authenticator secret");
    }
    const setupChallengeId = nanoid(32);
    this.setupChallenges.set(setupChallengeId, {
      userId: String(user._id),
      secret: secret.base32,
      expiresAt: Date.now() + 10 * 60_000,
    });
    await this.audit(String(user._id), "auth.2fa.setup.started", request);
    return {
      setupChallengeId,
      qrCodeDataUrl: await qrcode.toDataURL(secret.otpauth_url),
      otpauthUrl: secret.otpauth_url,
      expiresInSeconds: 600,
      message: "Scan the QR code and verify a 6-digit authenticator code.",
    };
  }

  async verifyTwoFactorSetup(userIdOrToken: string, setupChallengeId: string, code: string) {
    const user = await this.resolveTwoFactorSetupUser(userIdOrToken);
    const challenge = this.setupChallenges.get(setupChallengeId);
    if (
      !challenge ||
      challenge.userId !== String(user._id) ||
      challenge.expiresAt < Date.now()
    ) {
      throw new UnauthorizedException("Invalid or expired 2FA setup session");
    }
    this.verifyTotpCode(challenge.secret, code, String(user._id), false);
    return { verified: true, message: "Authenticator code verified." };
  }

  async enableTwoFactor(
    userIdOrToken: string,
    setupChallengeId: string,
    code: string,
    device?: Record<string, unknown>,
    request?: Request,
  ) {
    const user = await this.resolveTwoFactorSetupUser(userIdOrToken);
    const challenge = this.setupChallenges.get(setupChallengeId);
    if (
      !challenge ||
      challenge.userId !== String(user._id) ||
      challenge.expiresAt < Date.now()
    ) {
      throw new UnauthorizedException("Invalid or expired 2FA setup session");
    }

    const verified = this.verifyTotpCode(
      challenge.secret,
      code,
      String(user._id),
      false,
    );
    const backupCodes = this.generateBackupCodes();
    user.twoFactorEnabled = true;
    user.twoFactorSecret = this.encryptSecret(challenge.secret);
    user.twoFactorVerifiedAt = new Date();
    user.lastTotpStep = verified.step;
    user.backupCodes = await Promise.all(
      backupCodes.map(async (backupCode) => ({
        codeHash: await bcrypt.hash(backupCode, 12),
        createdAt: new Date(),
      })),
    );
    await user.save();
    this.setupChallenges.delete(setupChallengeId);
    await this.audit(String(user._id), "auth.2fa.enabled", request);

    const tokenPayload = await this.decodeTwoFactorToken(userIdOrToken);
    const session = tokenPayload?.purpose
      ? await this.createSession(user, device, request, { skipTwoFactor: true })
      : undefined;

    return {
      twoFactorEnabled: true,
      backupCodes,
      message: "Two-factor authentication enabled.",
      ...(session ?? {}),
    };
  }

  async disableTwoFactor(userId: string, code: string, request?: Request) {
    const user = await this.users.findDocumentById(userId);
    if (!user) throw new UnauthorizedException("Invalid session");
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return { twoFactorEnabled: false, message: "2FA is already disabled." };
    }
    await this.verifyUserTwoFactor(user, code);
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    user.twoFactorVerifiedAt = undefined;
    user.lastTotpStep = undefined;
    await user.save();
    await this.audit(String(user._id), "auth.2fa.disabled", request);
    return { twoFactorEnabled: false, message: "Two-factor authentication disabled." };
  }

  async regenerateBackupCodes(userId: string, code: string, request?: Request) {
    const user = await this.users.findDocumentById(userId);
    if (!user) throw new UnauthorizedException("Invalid session");
    if (!user.twoFactorEnabled) throw new BadRequestException("Enable 2FA first");
    await this.verifyUserTwoFactor(user, code);
    const backupCodes = this.generateBackupCodes();
    user.backupCodes = await Promise.all(
      backupCodes.map(async (backupCode) => ({
        codeHash: await bcrypt.hash(backupCode, 12),
        createdAt: new Date(),
      })),
    );
    await user.save();
    await this.audit(String(user._id), "auth.2fa.backup_codes.regenerated", request);
    return { backupCodes, message: "New backup codes generated." };
  }

  async verifyTwoFactorLogin(
    challengeToken: string,
    code: string,
    device: Record<string, unknown> | undefined,
    request: Request,
  ) {
    const payload = await this.decodeTwoFactorToken(challengeToken);
    if (!payload || payload.purpose !== "2fa_login") {
      throw new UnauthorizedException("Invalid or expired 2FA challenge");
    }
    const user = await this.users.findDocumentById(payload.sub);
    if (!user) throw new UnauthorizedException("Invalid 2FA challenge");
    await this.verifyUserTwoFactor(user, code);
    await this.audit(String(user._id), "auth.2fa.login.verified", request);
    return this.createSession(user, device, request, { skipTwoFactor: true });
  }

  private async createSession(
    user: any,
    device: Record<string, unknown> | undefined,
    request: Request | undefined,
    options: { skipTwoFactor?: boolean } = {},
  ) {
    if (!options.skipTwoFactor) {
      const challenge = await this.buildTwoFactorChallenge(user);
      if (challenge) return challenge;
    }
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
    await this.syncBbpsCategoriesForRetailer(user);

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

  private async buildTwoFactorChallenge(user: any) {
    const userPreview = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      name: user.name,
      approvalStatus: user.approvalStatus,
    };
    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        challengeToken: await this.signTwoFactorToken(user, "2fa_login"),
        user: userPreview,
        message: "Enter your authenticator or backup code to continue.",
      };
    }
    if (this.isAdminTwoFactorEnforced(user)) {
      return {
        requiresTwoFactorSetup: true,
        setupToken: await this.signTwoFactorToken(user, "2fa_setup"),
        user: userPreview,
        message: "Admin accounts must set up authenticator 2FA before login.",
      };
    }
    return null;
  }

  private isAdminTwoFactorEnforced(user: any) {
    return (
      ["admin", "super_admin"].includes(user.role) &&
      this.config.get<string>("TOTP_ENFORCE_ADMIN", "false") === "true"
    );
  }

  private async signTwoFactorToken(user: any, purpose: "2fa_login" | "2fa_setup") {
    return this.jwt.signAsync(
      { sub: String(user._id), role: user.role, email: user.email, purpose },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: "5m",
      },
    );
  }

  private async decodeTwoFactorToken(token: string) {
    if (!token || token.length < 20) return null;
    try {
      return await this.jwt.verifyAsync<{
        sub: string;
        role: string;
        email: string;
        purpose: "2fa_login" | "2fa_setup";
      }>(token, { secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET") });
    } catch {
      return null;
    }
  }

  private async resolveTwoFactorSetupUser(userIdOrToken: string) {
    const payload = await this.decodeTwoFactorToken(userIdOrToken);
    const userId = payload?.sub ?? userIdOrToken;
    const user = await this.users.findDocumentById(userId);
    if (!user) throw new UnauthorizedException("Invalid 2FA setup session");
    return user;
  }

  private async verifyUserTwoFactor(user: any, code: string) {
    this.assertTwoFactorAllowed(String(user._id));
    const normalized = code.trim().replace(/\s+/g, "").toUpperCase();
    try {
      if (/^\d{6}$/.test(normalized) && user.twoFactorSecret) {
        const verified = this.verifyTotpCode(
          this.decryptSecret(user.twoFactorSecret),
          normalized,
          String(user._id),
          true,
          user.lastTotpStep,
        );
        user.lastTotpStep = verified.step;
        user.twoFactorVerifiedAt = new Date();
        await user.save();
        this.clearTwoFactorFailures(String(user._id));
        return;
      }
      const backupCodes = user.backupCodes ?? [];
      for (const backupCode of backupCodes) {
        if (!backupCode.usedAt && (await bcrypt.compare(normalized, backupCode.codeHash))) {
          backupCode.usedAt = new Date();
          user.twoFactorVerifiedAt = new Date();
          await user.save();
          this.clearTwoFactorFailures(String(user._id));
          return;
        }
      }
    } catch (error) {
      this.recordTwoFactorFailure(String(user._id));
      throw error;
    }
    this.recordTwoFactorFailure(String(user._id));
    throw new UnauthorizedException("Invalid authenticator or backup code");
  }

  private verifyTotpCode(
    secret: string,
    code: string,
    userId: string,
    preventReplay: boolean,
    lastTotpStep?: number,
  ) {
    const delta = speakeasy.totp.verifyDelta({
      secret,
      encoding: "base32",
      token: code,
      step: 30,
      window: 1,
    });
    if (!delta) throw new UnauthorizedException("Invalid authenticator code");
    const step = Math.floor(Date.now() / 30_000) + delta.delta;
    if (preventReplay && lastTotpStep && step <= lastTotpStep) {
      throw new UnauthorizedException("Authenticator code already used");
    }
    this.clearTwoFactorFailures(userId);
    return { step };
  }

  private generateBackupCodes() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const makeCode = customAlphabet(alphabet, 10);
    return Array.from({ length: 10 }, () => {
      const raw = makeCode();
      return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    });
  }

  private encryptSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  private decryptSecret(value: string) {
    const [, iv, tag, encrypted] = value.split(":");
    if (!iv || !tag || !encrypted) throw new UnauthorizedException("Invalid 2FA secret");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey(),
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  private encryptionKey() {
    return createHash("sha256")
      .update(
        this.config.get<string>("TOTP_SECRET_ENCRYPTION_KEY") ??
          this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      )
      .digest();
  }

  private assertTwoFactorAllowed(userId: string) {
    const state = this.twoFactorAttempts.get(userId);
    if (state && state.count >= 5 && state.resetAt > Date.now()) {
      throw new HttpException(
        "Too many 2FA attempts. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordTwoFactorFailure(userId: string) {
    const current = this.twoFactorAttempts.get(userId);
    if (!current || current.resetAt < Date.now()) {
      this.twoFactorAttempts.set(userId, {
        count: 1,
        resetAt: Date.now() + 10 * 60_000,
      });
      return;
    }
    this.twoFactorAttempts.set(userId, {
      count: current.count + 1,
      resetAt: current.resetAt,
    });
  }

  private clearTwoFactorFailures(userId: string) {
    this.twoFactorAttempts.delete(userId);
  }

  private async audit(userId: string, action: string, request?: Request) {
    await this.activityLogModel.create({
      userId: new Types.ObjectId(userId),
      action,
      ipAddress: request?.ip,
      metadata: {
        userAgent: request?.headers["user-agent"],
      },
    });
  }

  private async syncBbpsCategoriesForRetailer(user: any) {
    if (user.role !== "retailer") return;
    try {
      await this.bbps.syncCategories();
    } catch (error) {
      console.error("BBPS category sync failed during login", error);
    }
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
    type: "registration" | "login" | "password_reset",
  ) {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    if (!host || !user || !pass || user === "replace" || pass === "replace")
      return false;

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
        : type === "password_reset"
          ? "Reset your BharatPayU password"
          : "BharatPayU login OTP";
    try {
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
      return true;
    } catch {
      return false;
    }
  }

  private async verifyOtpCode(
    email: string,
    otp: string,
    type: "registration" | "login" | "password_reset",
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
