import {
  Body,
  Controller,
  Get,
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
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from "class-validator";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { DistributorService } from "./distributor.service";

class DistributorRetailerDto {
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
  @IsString()
  pincode?: string;
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

  @Post("retailers")
  createRetailer(
    @Req() req: { user: { id: string } },
    @Body() dto: DistributorRetailerDto,
  ) {
    return this.distributor.createRetailer(req.user.id, dto);
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
