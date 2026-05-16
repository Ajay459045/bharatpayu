import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Response, Request } from "express";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TwoFactorCodeDto,
  TwoFactorEnableDto,
  TwoFactorLoginDto,
  TwoFactorSetupDto,
  VerifyEmailOtpDto,
  VerifyOtpDto,
} from "./dto/otp.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("register/otp/verify")
  async verifyRegistrationOtp(
    @Body() dto: VerifyEmailOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.verifyRegistrationOtp(
      dto.email,
      dto.otp,
      dto.challengeId,
    );
    if ("refreshToken" in session) this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      dto.email,
      dto.password,
      dto.device,
      req,
    );
    if ("refreshToken" in result)
      this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post("login/otp/verify")
  async verifyLoginOtp(
    @Body() dto: VerifyEmailOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.verifyLoginOtp(
      dto.email,
      dto.otp,
      dto.challengeId,
      dto.device,
      req,
    );
    if ("refreshToken" in session) this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Post("password/forgot")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post("password/reset")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("password/change")
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.auth.changePassword(req.user?.id ?? "", dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("2fa/status")
  twoFactorStatus(@Req() req: Request & { user?: { id?: string } }) {
    return this.auth.twoFactorStatus(req.user?.id ?? "");
  }

  @Post("2fa/setup")
  setupTwoFactor(@Body() dto: TwoFactorSetupDto, @Req() req: Request) {
    return this.auth.setupTwoFactor(this.twoFactorSubject(req, dto.setupToken), req);
  }

  @Post("2fa/verify")
  verifyTwoFactorSetup(@Body() dto: TwoFactorEnableDto, @Req() req: Request) {
    return this.auth.verifyTwoFactorSetup(
      this.twoFactorSubject(req, dto.setupToken),
      dto.setupChallengeId,
      dto.code,
    );
  }

  @Post("2fa/enable")
  async enableTwoFactor(
    @Body() dto: TwoFactorEnableDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.enableTwoFactor(
      this.twoFactorSubject(req, dto.setupToken),
      dto.setupChallengeId,
      dto.code,
      dto.device,
      req,
    );
    if ("refreshToken" in result) this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("2fa/disable")
  disableTwoFactor(
    @Body() dto: TwoFactorCodeDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.auth.disableTwoFactor(req.user?.id ?? "", dto.code, req);
  }

  @Post("2fa/verify-login")
  async verifyTwoFactorLogin(
    @Body() dto: TwoFactorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.verifyTwoFactorLogin(
      dto.challengeToken,
      dto.code,
      dto.device,
      req,
    );
    if ("refreshToken" in session) this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("2fa/regenerate-backup-codes")
  regenerateBackupCodes(
    @Body() dto: TwoFactorCodeDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.auth.regenerateBackupCodes(req.user?.id ?? "", dto.code, req);
  }

  @Post("otp/verify")
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.verifyOtp(dto.mobile, dto.device, req);
    if ("refreshToken" in session) this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie("bharatpayu.refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  private twoFactorSubject(req: Request, setupToken?: string) {
    if (setupToken) return setupToken;
    const authorization = req.headers.authorization ?? "";
    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) return token;
    throw new UnauthorizedException("Login again before managing 2FA");
  }
}
