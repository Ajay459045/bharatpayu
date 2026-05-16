import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FetchBillDto } from "./dto/fetch-bill.dto";
import { PayBillDto } from "./dto/pay-bill.dto";
import { BbpsService } from "./bbps.service";

@UseGuards(AuthGuard("jwt"))
@Controller("bbps")
export class BbpsController {
  constructor(private readonly bbps: BbpsService) {}

  @Get("categories")
  categories() {
    return this.bbps.categories();
  }

  @Post("categories/sync")
  syncCategories() {
    return this.bbps.syncCategories();
  }

  @Get("billers")
  billers(
    @Query("categoryKey") categoryKey: string,
    @Query("sync") sync?: string,
  ) {
    return this.bbps.billers(categoryKey, sync === "true" || sync === "1");
  }

  @Get("biller-details")
  billerDetails(@Query("billerId") billerId: string) {
    return this.bbps.billerDetails(billerId);
  }

  @Post("fetch-bill")
  fetchBill(
    @Body() dto: FetchBillDto,
    @Req() req: { user: { id: string }; ip?: string },
  ) {
    return this.bbps.fetchBill(dto, req.user.id, req);
  }

  @Post("pay")
  pay(
    @Body() dto: PayBillDto,
    @Req() req: { user: { id: string }; ip?: string },
  ) {
    return this.bbps.payBill(dto, req.user.id, req);
  }

  @Get("transactions")
  transactions(
    @Query() query: Record<string, string>,
    @Req() req: { user: { id: string; role: string } },
  ) {
    return this.bbps.findTransactions(query, {
      retailerId: req.user.id,
      role: req.user.role,
    });
  }
}
