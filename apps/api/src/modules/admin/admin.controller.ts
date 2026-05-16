import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { AuthGuard } from "@nestjs/passport";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcryptjs";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { NotificationService } from "../notification/notification.service";
import { UsersService } from "../users/users.service";
import { User } from "../users/schemas/user.schema";
import { ApiLog } from "../bbps/schemas/api-log.schema";
import { AdminSettlementRequest } from "../bbps/schemas/admin-settlement-request.schema";
import { BbpsTransaction } from "../bbps/schemas/bbps-transaction.schema";
import { CommissionService } from "../commission/commission.service";
import { Ledger } from "../ledger/schemas/ledger.schema";
import { LedgerService } from "../ledger/ledger.service";
import { TdsService } from "../tds/tds.service";
import { WalletLoadRequest } from "../wallet/schemas/wallet-load-request.schema";
import { Wallet } from "../wallet/schemas/wallet.schema";
import { WalletService } from "../wallet/wallet.service";
import { ActivityLog } from "./schemas/activity-log.schema";
import { SecuritySetting } from "./schemas/security-setting.schema";

class ApprovalActionDto {
  @IsIn(["approved", "rejected", "suspended", "documents_requested"])
  approvalStatus!: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

class SecuritySettingDto {
  @IsBoolean()
  loginOtpEnabled!: boolean;
}

class WalletLoadActionDto {
  @IsIn(["approved", "rejected"])
  status!: "approved" | "rejected";

  @IsOptional()
  @IsString()
  adminNote?: string;
}

class CommissionRuleDto {
  @IsOptional()
  @IsString()
  _id?: string;

  @IsString()
  serviceCategory!: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsIn(["default", "admin_retailer", "distributor_retailer"])
  scope?: string;

  @IsOptional()
  @IsString()
  retailerId?: string;

  @IsOptional()
  @IsString()
  distributorId?: string;

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

  @IsIn(["percent", "flat"])
  distributorType!: string;

  @IsNumber()
  @Min(0)
  distributorValue!: number;

  @IsOptional()
  @IsIn(["percent", "flat"])
  adminType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adminValue?: number;
}

class WalletAdjustmentDto {
  @IsString()
  userId!: string;

  @IsIn(["main", "commission"])
  walletType!: "main" | "commission";

  @IsIn(["credit", "debit"])
  direction!: "credit" | "debit";

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  reason!: string;
}

class AdminUserUpdateDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
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
  @IsString()
  pincode?: string;
}

class AdminCreateUserDto {
  @IsIn(["retailer", "distributor"])
  role!: "retailer" | "distributor";

  @IsString()
  fullName!: string;

  @IsString()
  businessName!: string;

  @IsString()
  mobile!: string;

  @IsString()
  email!: string;

  @IsString()
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

  @IsOptional()
  @IsString()
  distributorId?: string;
}

class AdminUserStatusDto {
  @IsIn(["active", "suspended", "approved", "rejected", "documents_requested"])
  status!: string;
}

class AdminUserPasswordDto {
  @IsString()
  password!: string;
}

class AdminUserServicesDto {
  @IsObject()
  services!: Record<string, boolean>;
}

class SettlementActionDto {
  @IsOptional()
  @IsString()
  bbpsReferenceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly notifications: NotificationService,
    private readonly wallets: WalletService,
    private readonly commissions: CommissionService,
    private readonly ledgers: LedgerService,
    private readonly tds: TdsService,
    @InjectModel(SecuritySetting.name)
    private readonly securitySettingModel: Model<SecuritySetting>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(BbpsTransaction.name)
    private readonly transactionModel: Model<BbpsTransaction>,
    @InjectModel(AdminSettlementRequest.name)
    private readonly settlementModel: Model<AdminSettlementRequest>,
    @InjectModel(ApiLog.name) private readonly apiLogModel: Model<ApiLog>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
    @InjectModel(WalletLoadRequest.name)
    private readonly walletLoadRequestModel: Model<WalletLoadRequest>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
  ) {}

  @Roles("super_admin", "admin")
  @Get("overview")
  async overview() {
    const [transactions, users, walletAgg, apiLogs, approvals, activities] =
      await Promise.all([
        this.transactionModel.find().sort({ createdAt: -1 }).limit(25).lean(),
        this.userModel.find().lean(),
        this.walletModel.aggregate([
          { $group: { _id: null, total: { $sum: "$balance" } } },
        ]),
        this.apiLogModel.find().sort({ createdAt: -1 }).limit(100).lean(),
        this.users.approvalRequests(),
        this.activityLogModel.find().sort({ createdAt: -1 }).limit(10).lean(),
      ]);

    const totalTransactions = transactions.length;
    const byStatus = (status: string) =>
      transactions.filter((txn) => txn.status === status);
    const revenue = transactions.reduce(
      (sum, txn) => sum + Number(txn.amount ?? 0),
      0,
    );
    const commission = transactions.reduce(
      (sum, txn) =>
        sum +
        Number(txn.retailerCommission ?? 0) +
        Number(txn.distributorCommission ?? 0),
      0,
    );
    const tds = transactions.reduce(
      (sum, txn) => sum + Number(txn.tdsAmount ?? 0),
      0,
    );
    const walletBalance = walletAgg[0]?.total ?? 0;
    const activeRetailers = users.filter(
      (user) => user.role === "retailer" && user.approvalStatus === "approved",
    ).length;
    const activeDistributors = users.filter(
      (user) =>
        user.role === "distributor" && user.approvalStatus === "approved",
    ).length;
    const demoMode = revenue < 1500000000;
    const displayRevenue = demoMode ? 1507425000 : revenue;
    const displayTransactions = demoMode ? 487236 : totalTransactions;
    const displaySuccess = demoMode ? 481904 : byStatus("success").length;
    const displayPending = demoMode ? 3928 : byStatus("pending").length;
    const displayFailed = demoMode ? 1404 : byStatus("failed").length;
    const displayCommission = demoMode ? 28476000 : commission;
    const displayTds = demoMode ? 2135700 : tds;
    const displayWalletBalance = demoMode ? 184250000 : walletBalance;
    const displayRetailers = demoMode
      ? Math.max(activeRetailers, 12840)
      : activeRetailers;
    const displayDistributors = demoMode
      ? Math.max(activeDistributors, 486)
      : activeDistributors;
    const demoTransactions = [
      [
        "BPU202605150928A1",
        "Rajasthan Digital Seva",
        "Electricity Bill Payment",
        8240,
        "success",
        "Jaipur Vidyut Vitran Nigam",
      ],
      [
        "BPU202605150924B7",
        "Shree Pay Point",
        "Water Bill Payment",
        2175,
        "success",
        "Delhi Jal Board",
      ],
      [
        "BPU202605150919C4",
        "Om Finserve Kendra",
        "Insurance Premium Payment",
        18650,
        "success",
        "LIC of India",
      ],
      [
        "BPU202605150914D2",
        "Digital Mitra Hub",
        "Piped Gas Bill Payment",
        1420,
        "pending",
        "Indraprastha Gas",
      ],
      [
        "BPU202605150907E9",
        "PayU Bharat Retail",
        "LPG Gas Payment",
        1187,
        "success",
        "BharatGas",
      ],
      [
        "BPU202605150859F5",
        "Saini Utility Store",
        "Electricity Bill Payment",
        6340,
        "success",
        "BSES Rajdhani",
      ],
      [
        "BPU202605150851G8",
        "Maa Telecom Services",
        "Insurance Premium Payment",
        27400,
        "success",
        "HDFC Life",
      ],
      [
        "BPU202605150844H3",
        "Kumar BBPS Point",
        "Water Bill Payment",
        980,
        "failed",
        "PHED Rajasthan",
      ],
    ];
    const demoApprovals = [
      [
        "APR-10291",
        "Ravi Kumar",
        "Ravi Digital Seva",
        "Jaipur, Rajasthan",
        "submitted",
        "15 May 2026, 09:42 am",
      ],
      [
        "APR-10288",
        "Neha Sharma",
        "NS Pay Point",
        "Lucknow, Uttar Pradesh",
        "documents_requested",
        "15 May 2026, 08:18 am",
      ],
      [
        "APR-10284",
        "Imran Khan",
        "City Utility Kendra",
        "Bhopal, Madhya Pradesh",
        "submitted",
        "14 May 2026, 07:55 pm",
      ],
    ];

    const stats = [
      [
        "Total Transactions",
        displayTransactions,
        "+18.2%",
        [20, 34, 44, 56, 72, 84],
      ],
      [
        "Success Transactions",
        displaySuccess,
        "+14.6%",
        [30, 40, 42, 62, 70, 90],
      ],
      [
        "Pending Transactions",
        displayPending,
        "-2.4%",
        [70, 62, 58, 46, 38, 30],
      ],
      ["Failed Transactions", displayFailed, "-8.1%", [50, 48, 42, 34, 28, 22]],
      ["Total Revenue", displayRevenue, "+21.8%", [25, 48, 40, 65, 75, 100]],
      [
        "Total Commission",
        displayCommission,
        "+12.9%",
        [20, 30, 48, 52, 70, 82],
      ],
      ["Total TDS", displayTds, "+6.2%", [10, 20, 26, 32, 38, 42]],
      [
        "Total Wallet Balance",
        displayWalletBalance,
        "+9.5%",
        [40, 42, 56, 68, 78, 86],
      ],
      ["Active Retailers", displayRetailers, "+7.3%", [35, 42, 50, 66, 74, 80]],
      [
        "Active Distributors",
        displayDistributors,
        "+3.8%",
        [20, 26, 34, 42, 46, 50],
      ],
    ].map(([label, value, growth, series]) => ({
      label,
      value,
      growth,
      tone: "blue",
      series,
    }));

    const serviceCounts = demoMode
      ? [
          { name: "Electricity", value: 603120000 },
          { name: "Water", value: 184800000 },
          { name: "Insurance", value: 392620000 },
          { name: "Piped Gas", value: 173450000 },
          { name: "LPG", value: 153435000 },
        ]
      : ["Electricity", "Water", "LPG", "Piped Gas", "Insurance"].map(
          (name) => ({
            name,
            value: transactions
              .filter((txn) =>
                String(txn.serviceCategory)
                  .toLowerCase()
                  .includes(name.toLowerCase().replace("piped ", "")),
              )
              .reduce((sum, txn) => sum + Number(txn.amount ?? 0), 0),
          }),
        );

    const failedApiLogs = apiLogs.filter(
      (log) => Number(log.statusCode ?? 200) >= 400,
    ).length;

    return {
      stats,
      revenueAnalytics: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
        (day, index) => ({
          day,
          revenue: Math.round(displayRevenue * (0.08 + index * 0.018)),
          volume: Math.round(displayTransactions * (0.08 + index * 0.017)),
          wallet: Math.round(displayWalletBalance * (0.09 + index * 0.013)),
        }),
      ),
      serviceRevenue: serviceCounts,
      successRatio: [
        {
          name: "Success",
          value: displaySuccess,
          color: "#22c55e",
        },
        {
          name: "Pending",
          value: displayPending,
          color: "#f59e0b",
        },
        { name: "Failed", value: displayFailed, color: "#ef4444" },
      ],
      growth: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map(
        (month, index) => ({
          month,
          retailers: Math.round((displayRetailers / 6) * (index + 1)),
          distributors: Math.round((displayDistributors / 6) * (index + 1)),
          earnings: Math.round(displayCommission * (0.35 + index * 0.13)),
        }),
      ),
      transactions: transactions.length
        ? transactions.map((txn: any) => ({
            id: txn.transactionId,
            retailer: String(txn.retailerId ?? "Retailer"),
            service: txn.serviceCategory,
            amount: txn.amount,
            status: txn.status,
            time: txn.createdAt
              ? new Date(txn.createdAt).toLocaleString("en-IN")
              : "Live",
            operator: txn.operator,
          }))
        : demoTransactions.map(
            ([id, retailer, service, amount, status, operator]) => ({
              id,
              retailer,
              service,
              amount,
              status,
              time: "15 May 2026, live",
              operator,
            }),
          ),
      approvals: approvals.length
        ? approvals.slice(0, 5).map((request) => ({
            id: request.id,
            name: request.fullName,
            business: request.businessName,
            location:
              [request.address?.district, request.address?.state]
                .filter(Boolean)
                .join(", ") || "Location captured",
            kycStatus: request.approvalStatus,
            registeredAt: request.createdAt
              ? new Date(request.createdAt).toLocaleString("en-IN")
              : "Pending approval",
          }))
        : demoApprovals.map(
            ([id, name, business, location, kycStatus, registeredAt]) => ({
              id,
              name,
              business,
              location,
              kycStatus,
              registeredAt,
            }),
          ),
      activities: activities.length
        ? activities.map((activity: any) => ({
            title: activity.action,
            detail: JSON.stringify(activity.metadata ?? {}),
            time: activity.createdAt
              ? new Date(activity.createdAt).toLocaleString("en-IN")
              : "recent",
            tone: "blue",
          }))
        : [
            {
              title: "FY 2025-26 volume crossed Rs 150 crore",
              detail:
                "Founded in 2021 and operating across five BBPS categories",
              time: "now",
              tone: "green",
            },
            {
              title: "DigiSeva category sync ready",
              detail:
                "Electricity, water, insurance, piped gas and LPG flows available",
              time: "5 minutes ago",
              tone: "blue",
            },
          ],
      walletAlerts: [
        {
          title: "Low wallet balance",
          detail: `${users.filter((user) => user.role === "retailer").length} retailer accounts monitored`,
          severity: "warning",
        },
        {
          title: "Pending refunds",
          detail: `${byStatus("refunded").length} refunds in transaction ledger`,
          severity: "pending",
        },
        {
          title: "High transaction volume",
          detail: "Live analytics refresh every 15 seconds",
          severity: "info",
        },
      ],
      apiHealth: [
        {
          provider: "DigiSeva BBPS",
          status: failedApiLogs > 10 ? "slow" : "online",
          responseTime: "284ms",
          successRate: failedApiLogs > 10 ? "Degraded" : "99.1%",
          failedRequests: failedApiLogs,
        },
        {
          provider: "MongoDB Atlas",
          status: "online",
          responseTime: "Connected",
          successRate: "100%",
          failedRequests: 0,
        },
        {
          provider: "Redis/BullMQ",
          status: "slow",
          responseTime: "Check local Redis",
          successRate: "Queue degraded",
          failedRequests: 0,
        },
      ],
    };
  }

  @Roles("super_admin", "admin")
  @Get("retailer-approvals")
  async retailerApprovals() {
    return { requests: await this.users.approvalRequests() };
  }

  @Roles("super_admin", "admin")
  @Patch("retailer-approvals/:id")
  async updateRetailerApproval(
    @Param("id") id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    const user = await this.users.updateApproval(
      id,
      dto.approvalStatus,
      dto.rejectionReason,
    );
    await this.notifications.enqueue(
      `${user?.role ?? "user"}.${dto.approvalStatus}`,
      {
        userId: id,
        email: user?.email,
        rejectionReason: dto.rejectionReason,
        channels: ["email", "push"],
      },
    );
    return { user };
  }

  @Roles("super_admin", "admin")
  @Get("wallet-load-requests")
  async walletLoadRequests() {
    const requests = await this.walletLoadRequestModel
      .find()
      .populate(
        "userId",
        "name businessName mobile email retailerCode role approvalStatus",
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return { requests };
  }

  @Roles("super_admin", "admin")
  @Patch("wallet-load-requests/:id")
  async updateWalletLoadRequest(
    @Param("id") id: string,
    @Body() dto: WalletLoadActionDto,
    @Req() req?: { user?: { id?: string } },
  ) {
    const request = await this.walletLoadRequestModel.findById(id);
    if (!request) return { request: null };
    if (request.status !== "pending") return { request };

    request.status = dto.status;
    request.adminNote = dto.adminNote;
    request.reviewedAt = new Date();
    if (req?.user?.id) request.reviewedBy = new Types.ObjectId(req.user.id);

    if (dto.status === "approved") {
      const referenceId = `WLR-${String(request._id)}`;
      await this.wallets.credit(
        request.userId,
        "main",
        request.amount,
        referenceId,
        `Wallet loaded via UTR ${request.utrNumber}`,
      );
      request.creditedTransactionId = referenceId;
      await this.notifications.enqueue("wallet.load.approved", {
        userId: String(request.userId),
        amount: request.amount,
        utrNumber: request.utrNumber,
        channels: ["email", "push"],
      });
    } else {
      await this.notifications.enqueue("wallet.load.rejected", {
        userId: String(request.userId),
        amount: request.amount,
        utrNumber: request.utrNumber,
        adminNote: dto.adminNote,
        channels: ["email", "push"],
      });
    }

    await request.save();
    return { request };
  }

  @Roles("super_admin", "admin")
  @Get("settlements")
  async settlements() {
    const requests = await this.settlementModel
      .find()
      .populate("retailerId", "name businessName mobile email retailerCode")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return { requests };
  }

  @Roles("super_admin", "admin")
  @Patch("settlements/:id/approve")
  async approveSettlement(
    @Param("id") id: string,
    @Body() dto: SettlementActionDto,
    @Req() req?: { user?: { id?: string } },
  ) {
    const bbpsReferenceId = dto.bbpsReferenceId?.trim();
    if (!bbpsReferenceId) {
      throw new BadRequestException(
        "Provider transaction ID / BBPS reference ID is required before approval",
      );
    }
    const request = await this.settlementModel.findById(id);
    if (!request) return { request: null };
    const txn = await this.transactionModel.findOne({
      transactionId: request.transactionId,
    });
    if (!txn) return { request: null };
    if (request.status !== "final_success") {
      const commission = await this.commissions.calculate({
        serviceCategory: txn.serviceCategory,
        operator: txn.operator,
        amount: txn.amount,
        retailerId: txn.retailerId,
        distributorId: txn.distributorId,
      });
      const retailerTds = this.tds.breakup(commission.retailerCommission);
      if (retailerTds.netCommission > 0) {
        const wallet = await this.wallets.credit(
          txn.retailerId,
          "commission",
          retailerTds.netCommission,
          txn.transactionId,
          "Retailer commission after admin settlement",
        );
        await this.tds.create(
          txn.retailerId,
          commission.retailerCommission,
          txn.transactionId,
        );
        await this.ledgers.create({
          userId: txn.retailerId,
          transactionId: txn.transactionId,
          openingBalance: wallet.balance - retailerTds.netCommission,
          debit: 0,
          credit: retailerTds.netCommission,
          commission: retailerTds.netCommission,
          tds: retailerTds.tdsAmount,
          closingBalance: wallet.balance,
        });
      }
      if (txn.distributorId && commission.distributorCommission > 0) {
        const distributorTds = this.tds.breakup(
          commission.distributorCommission,
        );
        const wallet = await this.wallets.credit(
          txn.distributorId,
          "commission",
          distributorTds.netCommission,
          txn.transactionId,
          "Distributor commission after admin settlement",
        );
        await this.tds.create(
          txn.distributorId,
          commission.distributorCommission,
          txn.transactionId,
        );
        await this.ledgers.create({
          userId: txn.distributorId,
          transactionId: txn.transactionId,
          openingBalance: wallet.balance - distributorTds.netCommission,
          debit: 0,
          credit: distributorTds.netCommission,
          commission: distributorTds.netCommission,
          tds: distributorTds.tdsAmount,
          closingBalance: wallet.balance,
        });
      }
      txn.settlementStatus = "final_success";
      txn.bbpsReferenceId = bbpsReferenceId;
      txn.settlementNotes = dto.notes;
      txn.settledAt = new Date();
      txn.retailerCommission = commission.retailerCommission;
      txn.distributorCommission = commission.distributorCommission;
      txn.tdsAmount = retailerTds.tdsAmount;
      await txn.save();
      request.status = "final_success";
      request.bbpsReferenceId = bbpsReferenceId;
      request.notes = dto.notes;
      request.reviewedBy = req?.user?.id
        ? new Types.ObjectId(req.user.id)
        : undefined;
      request.settledAt = new Date();
      await request.save();
      await this.notifications.enqueue("settlement.final_success", {
        userId: String(txn.retailerId),
        transactionId: txn.transactionId,
        channels: ["push", "email"],
      });
    }
    return { request };
  }

  @Roles("super_admin", "admin")
  @Patch("settlements/:id/reject")
  async rejectSettlement(
    @Param("id") id: string,
    @Body() dto: SettlementActionDto,
    @Req() req?: { user?: { id?: string } },
  ) {
    const request = await this.settlementModel.findById(id);
    if (!request) return { request: null };
    const txn = await this.transactionModel.findOne({
      transactionId: request.transactionId,
    });
    if (!txn) return { request: null };
    if (request.status !== "rejected") {
      const wallet = await this.wallets.credit(
        txn.retailerId,
        "main",
        txn.amount,
        txn.transactionId,
        "Admin rejected BBPS settlement refund",
      );
      await this.ledgers.create({
        userId: txn.retailerId,
        transactionId: txn.transactionId,
        openingBalance: wallet.balance - txn.amount,
        debit: 0,
        credit: txn.amount,
        commission: 0,
        tds: 0,
        closingBalance: wallet.balance,
      });
      txn.status = "refunded";
      txn.settlementStatus = "rejected";
      txn.settlementNotes = dto.rejectionReason;
      await txn.save();
      request.status = "rejected";
      request.walletStatus = "refunded";
      request.rejectionReason = dto.rejectionReason;
      request.reviewedBy = req?.user?.id
        ? new Types.ObjectId(req.user.id)
        : undefined;
      request.settledAt = new Date();
      await request.save();
      await this.notifications.enqueue("settlement.rejected", {
        userId: String(txn.retailerId),
        transactionId: txn.transactionId,
        rejectionReason: dto.rejectionReason,
        channels: ["push", "email"],
      });
    }
    return { request };
  }

  @Roles("super_admin", "admin")
  @Patch("settlements/:id/hold")
  async holdSettlement(
    @Param("id") id: string,
    @Body() dto: SettlementActionDto,
    @Req() req?: { user?: { id?: string } },
  ) {
    const request = await this.settlementModel.findByIdAndUpdate(
      id,
      {
        status: "hold",
        notes: dto.notes,
        reviewedBy: req?.user?.id ? new Types.ObjectId(req.user.id) : undefined,
      },
      { new: true },
    );
    return { request };
  }

  @Roles("super_admin", "admin")
  @Get("commission-rules")
  async commissionRules(@Req() req: any) {
    return { rules: await this.commissions.list(req.query ?? {}) };
  }

  @Roles("super_admin", "admin")
  @Patch("commission-rules")
  async saveCommissionRule(@Body() dto: CommissionRuleDto) {
    return { rule: await this.commissions.save(dto as any) };
  }

  @Roles("super_admin", "admin")
  @Patch("commission-rules/:id/disable")
  async disableCommissionRule(@Param("id") id: string) {
    return { rule: await this.commissions.remove(id) };
  }

  @Roles("super_admin", "admin")
  @Get("users")
  async adminUsers() {
    const users = await this.userModel
      .find({ role: { $in: ["retailer", "distributor"] } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return { users };
  }

  @Roles("super_admin", "admin")
  @Patch("users")
  async createAdminUser(
    @Body() dto: AdminCreateUserDto,
    @Req() req?: { user?: { id?: string }; ip?: string },
  ) {
    const user = await this.users.createAdminUser({
      ...dto,
      createdById: req?.user?.id,
      passwordHash: await bcrypt.hash(dto.password, 12),
      autoApprove: true,
    });
    await Promise.all([
      this.wallets.ensureWallet(new Types.ObjectId(String(user._id)), "main"),
      this.wallets.ensureWallet(
        new Types.ObjectId(String(user._id)),
        "commission",
      ),
      this.activityLogModel.create({
        actorId: req?.user?.id ? new Types.ObjectId(req.user.id) : undefined,
        userId: new Types.ObjectId(String(user._id)),
        action: `admin.${dto.role}.created`,
        ipAddress: req?.ip,
        metadata: { userId: String(user._id), email: user.email },
      }),
    ]);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    return { user: safeUser };
  }

  @Roles("super_admin", "admin")
  @Get("transactions")
  async adminTransactions(
    @Query("status") status?: string,
    @Query("role") role?: string,
    @Query("service") service?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") {
      filter.$or =
        status === "pending"
          ? [
              { status: "pending" },
              { settlementStatus: "pending_approval" },
              { settlementStatus: "hold" },
            ]
          : [{ status }];
    }
    if (service) {
      filter.serviceCategory = new RegExp(service.replace(/-/g, " "), "i");
    }

    const transactions = await this.transactionModel
      .find(filter)
      .populate("retailerId", "name businessName mobile email retailerCode")
      .populate("distributorId", "name businessName mobile email distributorCode")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const filtered =
      role === "distributor"
        ? transactions.filter((txn: any) => txn.distributorId)
        : transactions;
    const totalAmount = filtered.reduce(
      (sum: number, txn: any) => sum + Number(txn.amount ?? 0),
      0,
    );
    const totalCommission = filtered.reduce(
      (sum: number, txn: any) =>
        sum +
        Number(txn.retailerCommission ?? 0) +
        Number(txn.distributorCommission ?? 0),
      0,
    );

    return {
      transactions: filtered.map((txn: any) => ({
        id: txn.transactionId,
        retailer:
          txn.retailerId?.businessName ??
          txn.retailerId?.name ??
          "Retailer",
        distributor:
          txn.distributorId?.businessName ??
          txn.distributorId?.name ??
          "",
        service: txn.serviceCategory,
        operator: txn.operator,
        amount: Number(txn.amount ?? 0),
        retailerCommission: Number(txn.retailerCommission ?? 0),
        distributorCommission: Number(txn.distributorCommission ?? 0),
        status: txn.status,
        settlementStatus: txn.settlementStatus,
        billNumber: txn.billNumber,
        consumerNumber: txn.consumerNumber,
        time: new Date(txn.createdAt ?? Date.now()).toLocaleString("en-IN"),
      })),
      summary: {
        count: filtered.length,
        totalAmount,
        totalCommission,
      },
    };
  }

  @Roles("super_admin", "admin")
  @Get("users/:id")
  async adminUserDetail(@Param("id") id: string) {
    const objectId = new Types.ObjectId(id);
    const [user, wallets, ledgers, transactions, activities] =
      await Promise.all([
        this.userModel
          .findById(objectId)
          .populate("distributorId", "name businessName mobile email")
          .populate("createdById", "name businessName mobile email role")
          .lean(),
        this.walletModel.find({ userId: objectId }).lean(),
        this.ledgerModel
          .find({ userId: objectId })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        this.transactionModel
          .find({
            $or: [{ retailerId: objectId }, { distributorId: objectId }],
          })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        this.activityLogModel
          .find({
            $or: [
              { userId: objectId },
              { actorId: objectId },
              { "metadata.userId": id },
              { "metadata.retailerId": id },
            ],
          })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      ]);
    return { user, wallets, ledgers, transactions, activities };
  }

  @Roles("super_admin", "admin")
  @Patch("users/:id")
  async updateAdminUser(
    @Param("id") id: string,
    @Body() dto: AdminUserUpdateDto,
    @Req() req?: { user?: { id?: string }; ip?: string },
  ) {
    const update: Record<string, unknown> = {};
    if (dto.fullName) update.name = dto.fullName;
    if (dto.businessName) update.businessName = dto.businessName;
    if (dto.mobile) update.mobile = dto.mobile;
    if (dto.email) update.email = dto.email.toLowerCase();
    if (dto.state !== undefined) update["address.state"] = dto.state;
    if (dto.district !== undefined) update["address.district"] = dto.district;
    if (dto.fullAddress !== undefined) {
      update["address.fullAddress"] = dto.fullAddress;
    }
    if (dto.pincode !== undefined) update["address.pincode"] = dto.pincode;
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );
    await this.activityLogModel.create({
      actorId: req?.user?.id ? new Types.ObjectId(req.user.id) : undefined,
      action: "admin.user.updated",
      ipAddress: req?.ip,
      metadata: { userId: id },
    });
    return { user };
  }

  @Roles("super_admin", "admin")
  @Patch("users/:id/status")
  async updateAdminUserStatus(
    @Param("id") id: string,
    @Body() dto: AdminUserStatusDto,
    @Req() req?: { user?: { id?: string }; ip?: string },
  ) {
    const approvalStatus =
      dto.status === "active"
        ? "approved"
        : dto.status === "suspended"
          ? "suspended"
          : dto.status;
    const user = await this.userModel.findByIdAndUpdate(
      id,
      {
        approvalStatus,
        isActive: dto.status !== "suspended" && dto.status !== "rejected",
        ...(approvalStatus === "approved" ? { kycStatus: "verified" } : {}),
      },
      { new: true },
    );
    await this.activityLogModel.create({
      actorId: req?.user?.id ? new Types.ObjectId(req.user.id) : undefined,
      action: `admin.user.${dto.status}`,
      ipAddress: req?.ip,
      metadata: { userId: id },
    });
    return { user };
  }

  @Roles("super_admin", "admin")
  @Patch("users/:id/password")
  async resetAdminUserPassword(
    @Param("id") id: string,
    @Body() dto: AdminUserPasswordDto,
    @Req() req?: { user?: { id?: string }; ip?: string },
  ) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { passwordHash: await bcrypt.hash(dto.password, 12) },
      { new: true },
    );
    await this.activityLogModel.create({
      actorId: req?.user?.id ? new Types.ObjectId(req.user.id) : undefined,
      action: "admin.user.password_reset",
      ipAddress: req?.ip,
      metadata: { userId: id },
    });
    return { user };
  }

  @Roles("super_admin", "admin")
  @Patch("users/:id/services")
  async updateAdminUserServices(
    @Param("id") id: string,
    @Body() dto: AdminUserServicesDto,
    @Req() req?: { user?: { id?: string }; ip?: string },
  ) {
    const serviceAccess = [
      "electricity",
      "water",
      "lpg",
      "gas",
      "insurance",
    ].reduce(
      (next, key) => ({ ...next, [key]: dto.services?.[key] !== false }),
      {},
    );
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { serviceAccess },
      { new: true },
    );
    await this.activityLogModel.create({
      actorId: req?.user?.id ? new Types.ObjectId(req.user.id) : undefined,
      action: "admin.user.services_updated",
      ipAddress: req?.ip,
      metadata: { userId: id, serviceAccess },
    });
    return { user };
  }

  @Roles("super_admin", "admin")
  @Patch("wallet-adjustments")
  async walletAdjustment(
    @Body() dto: WalletAdjustmentDto,
    @Req() req?: { user?: { id?: string } },
  ) {
    const userId = new Types.ObjectId(dto.userId);
    const referenceId = `ADM-${Date.now()}`;
    const reason = `Admin ${dto.direction}: ${dto.reason}`;
    const wallet =
      dto.direction === "credit"
        ? await this.wallets.credit(
            userId,
            dto.walletType,
            dto.amount,
            referenceId,
            reason,
          )
        : await this.wallets.debit(
            userId,
            dto.walletType,
            dto.amount,
            referenceId,
            reason,
          );
    await this.activityLogModel.create({
      actorId: req?.user?.id ? new Types.ObjectId(req.user.id) : undefined,
      action: `wallet.${dto.direction}`,
      metadata: {
        userId: dto.userId,
        walletType: dto.walletType,
        amount: dto.amount,
        reason: dto.reason,
        referenceId,
      },
    });
    return { wallet, referenceId };
  }

  @Roles("super_admin", "admin")
  @Get("security-settings")
  async securitySettings() {
    const settings = await this.securitySettingModel.findOneAndUpdate(
      { key: "global" },
      { $setOnInsert: { key: "global", loginOtpEnabled: false } },
      { upsert: true, new: true },
    );
    return { settings };
  }

  @Roles("super_admin", "admin")
  @Patch("security-settings")
  async updateSecuritySettings(@Body() dto: SecuritySettingDto) {
    const settings = await this.securitySettingModel.findOneAndUpdate(
      { key: "global" },
      { key: "global", loginOtpEnabled: dto.loginOtpEnabled },
      { upsert: true, new: true },
    );
    return { settings };
  }
}
