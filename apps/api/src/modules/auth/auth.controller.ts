import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { Response, Request } from "express";
import { LoginDto, RegisterDto, VerifyEmailOtpDto, VerifyOtpDto } from "./dto/otp.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("register/otp/verify")
  async verifyRegistrationOtp(@Body() dto: VerifyEmailOtpDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.verifyRegistrationOtp(dto.email, dto.otp, dto.challengeId);
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password, dto.device, req);
    if ("refreshToken" in result) this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post("login/otp/verify")
  async verifyLoginOtp(@Body() dto: VerifyEmailOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.verifyLoginOtp(dto.email, dto.otp, dto.challengeId, dto.device, req);
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Post("otp/verify")
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.verifyOtp(dto.mobile, dto.device, req);
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie("bharatpayu.refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30
    });
  }
}
