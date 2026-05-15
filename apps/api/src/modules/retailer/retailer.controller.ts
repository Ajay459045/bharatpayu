import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IsNumber, IsString, Min } from "class-validator";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { RetailerService } from "./retailer.service";

class WalletLoadRequestDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  utrNumber!: string;

  @IsString()
  screenshot!: string;
}

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("retailer")
@Controller("retailer")
export class RetailerController {
  constructor(private readonly retailer: RetailerService) {}

  @Get("overview")
  overview(@Req() req: { user: { id: string } }) {
    return this.retailer.overview(req.user.id);
  }

  @Get("profile")
  profile(@Req() req: { user: { id: string } }) {
    return this.retailer.profile(req.user.id);
  }

  @Get("services")
  services() {
    return this.retailer.services();
  }

  @Get("wallet")
  wallet(@Req() req: { user: { id: string } }) {
    return this.retailer.wallet(req.user.id);
  }

  @Post("wallet/load-requests")
  createWalletLoadRequest(
    @Req() req: { user: { id: string } },
    @Body() dto: WalletLoadRequestDto,
  ) {
    return this.retailer.createWalletLoadRequest(req.user.id, dto);
  }

  @Get("transactions")
  transactions(
    @Req() req: { user: { id: string } },
    @Query() query: Record<string, string>,
  ) {
    return this.retailer.transactions(req.user.id, query);
  }

  @Get("transactions/:transactionId")
  transaction(
    @Req() req: { user: { id: string } },
    @Param("transactionId") transactionId: string,
  ) {
    return this.retailer.transaction(req.user.id, transactionId);
  }

  @Get("reports")
  reports(@Req() req: { user: { id: string } }) {
    return this.retailer.reports(req.user.id);
  }

  @Get("notifications")
  notifications(@Req() req: { user: { id: string } }) {
    return this.retailer.notifications(req.user.id);
  }

  @Get("security")
  security(@Req() req: { user: { id: string } }) {
    return this.retailer.security(req.user.id);
  }
}
