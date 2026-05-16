import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class VerifyOtpDto {
  @Matches(/^[6-9]\d{9}$/)
  mobile!: string;

  @IsOptional()
  @IsString()
  otp?: string;

  @IsOptional()
  @IsObject()
  device?: Record<string, unknown>;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsObject()
  device?: Record<string, unknown>;
}

export class VerifyEmailOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  otp!: string;

  @IsOptional()
  @IsString()
  challengeId?: string;

  @IsOptional()
  @IsObject()
  device?: Record<string, unknown>;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  otp!: string;

  @IsOptional()
  @IsString()
  challengeId?: string;

  @MinLength(8)
  password!: string;

  @MinLength(8)
  confirmPassword!: string;
}

export class ChangePasswordDto {
  @MinLength(8)
  currentPassword!: string;

  @MinLength(8)
  newPassword!: string;

  @MinLength(8)
  confirmPassword!: string;
}

export class RegisterDto {
  @IsIn(["retailer", "distributor"])
  role!: "retailer" | "distributor";

  @IsString()
  fullName!: string;

  @IsString()
  businessName!: string;

  @Matches(/^[6-9]\d{9}$/)
  mobile!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @MinLength(8)
  confirmPassword!: string;

  @IsString()
  state!: string;

  @IsString()
  district!: string;

  @IsString()
  fullAddress!: string;

  @Matches(/^\d{6}$/)
  pincode!: string;

  @IsObject()
  documents!: {
    panImage: string;
    aadhaarFront: string;
    aadhaarBack: string;
    selfie: string;
  };

  @IsObject()
  location!: {
    latitude: number;
    longitude: number;
    ipAddress?: string;
    deviceInfo: Record<string, unknown>;
  };
}
