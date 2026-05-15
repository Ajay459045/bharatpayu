import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { BbpsService } from "../bbps/bbps.service";

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly bbps: BbpsService) {}

  @Roles("super_admin", "admin", "distributor", "retailer")
  @Get("transactions")
  transactions(@Query() query: Record<string, string>) {
    return this.bbps.findTransactions(query);
  }

  @Roles("super_admin", "admin")
  @Get("admin-summary")
  async adminSummary() {
    const txns = await this.bbps.findTransactions({});
    return {
      totalTransactions: txns.length,
      successTransactions: txns.filter((txn) => txn.status === "success").length,
      failedTransactions: txns.filter((txn) => txn.status === "failed").length,
      pendingTransactions: txns.filter((txn) => txn.status === "pending").length,
      totalRevenue: txns.reduce((sum, txn) => sum + Number(txn.amount ?? 0), 0),
      totalCommission: txns.reduce((sum, txn) => sum + Number(txn.retailerCommission ?? 0) + Number(txn.distributorCommission ?? 0), 0),
      totalTds: txns.reduce((sum, txn) => sum + Number(txn.tdsAmount ?? 0), 0)
    };
  }
}
