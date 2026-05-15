import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from "class-validator";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { DistributorService } from "./distributor.service";

class DistributorRetailerDraftDto {
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

class VerifyRetailerOtpDto extends DistributorRetailerDraftDto {
  @IsString()
  otp!: string;

  @IsString()
  challengeId!: string;
}

class UpdateRetailerDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @Matches(/^[6-9]\d{9}$/)
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  fullAddress?: string;

  @IsOptional()
  @Matches(/^\d{6}$/)
  pincode?: string;
}

class StatusDto {
  @IsIn(["active", "suspended"])
  status!: "active" | "suspended";
}

class PasswordDto {
  @MinLength(8)
  password!: string;
}

class WalletTopupDto {
  @IsNumber()
  @Min(1)
  amount!: number;
}

class ServiceAccessDto {
  @IsObject()
  services!: Record<string, boolean>;
}

class DistributorCommissionDto {
  @IsString()
  serviceCategory!: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsString()
  retailerId!: string;

  @IsNumber()
  @Min(0)
  minAmount!: number;

  @IsNumber()
  @Min(0)
  maxAmount!: number;

  @IsIn(["percent", "flat"])
  retailerType!: string;

  @IsNumber()
  @Min(0)
  retailerValue!: number;
}

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("distributor")
@Controller("distributor")
export class DistributorController {
  constructor(private readonly distributor: DistributorService) {}

  @Get("retailers")
  retailers(@Req() req: { user: { id: string } }) {
    return this.distributor.retailers(req.user.id);
  }

  @Post("retailers/otp")
  sendRetailerOtp(
    @Req() req: { user: { id: string }; ip?: string },
    @Body() dto: DistributorRetailerDraftDto,
  ) {
    return this.distributor.sendRetailerOtp(req.user.id, dto, req);
  }

  @Post("retailers")
  createRetailer(
    @Req() req: { user: { id: string }; ip?: string },
    @Body() dto: VerifyRetailerOtpDto,
  ) {
    return this.distributor.createRetailer(req.user.id, dto, req);
  }

  @Get("retailers/:id")
  retailer(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.distributor.retailer(req.user.id, id);
  }

  @Patch("retailers/:id")
  updateRetailer(
    @Req() req: { user: { id: string }; ip?: string },
    @Param("id") id: string,
    @Body() dto: UpdateRetailerDto,
  ) {
    return this.distributor.updateRetailer(req.user.id, id, dto, req);
  }

  @Patch("retailers/:id/status")
  updateStatus(
    @Req() req: { user: { id: string }; ip?: string },
    @Param("id") id: string,
    @Body() dto: StatusDto,
  ) {
    return this.distributor.updateRetailerStatus(req.user.id, id, dto, req);
  }

  @Patch("retailers/:id/password")
  resetPassword(
    @Req() req: { user: { id: string }; ip?: string },
    @Param("id") id: string,
    @Body() dto: PasswordDto,
  ) {
    return this.distributor.resetRetailerPassword(req.user.id, id, dto, req);
  }

  @Patch("retailers/:id/services")
  updateServices(
    @Req() req: { user: { id: string }; ip?: string },
    @Param("id") id: string,
    @Body() dto: ServiceAccessDto,
  ) {
    return this.distributor.updateRetailerServices(req.user.id, id, dto, req);
  }

  @Post("retailers/:id/wallet/topup")
  topupWallet(
    @Req() req: { user: { id: string }; ip?: string },
    @Param("id") id: string,
    @Body() dto: WalletTopupDto,
  ) {
    return this.distributor.topupRetailerWallet(req.user.id, id, dto, req);
  }

  @Get("commission-rules")
  commissionRules(@Req() req: { user: { id: string } }) {
    return this.distributor.commissionRules(req.user.id);
  }

  @Patch("commission-rules")
  saveCommissionRule(
    @Req() req: { user: { id: string } },
    @Body() dto: DistributorCommissionDto,
  ) {
    return this.distributor.saveCommissionRule(req.user.id, dto);
  }
}
