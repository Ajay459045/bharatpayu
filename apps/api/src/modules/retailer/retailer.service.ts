import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Device } from "../auth/schemas/device.schema";
import { Session } from "../auth/schemas/session.schema";
import { BbpsBiller } from "../bbps/schemas/bbps-biller.schema";
import { BbpsCategory } from "../bbps/schemas/bbps-category.schema";
import { BbpsTransaction } from "../bbps/schemas/bbps-transaction.schema";
import { Ledger } from "../ledger/schemas/ledger.schema";
import { Notification } from "../notification/schemas/notification.schema";
import { TdsReport } from "../tds/schemas/tds-report.schema";
import { DocumentRecord } from "../users/schemas/document.schema";
import { LocationRecord } from "../users/schemas/location.schema";
import { User } from "../users/schemas/user.schema";
import { WalletTransaction } from "../wallet/schemas/wallet-transaction.schema";
import { WalletLoadRequest } from "../wallet/schemas/wallet-load-request.schema";
import { Wallet } from "../wallet/schemas/wallet.schema";
import { WalletService } from "../wallet/wallet.service";

const services = [
  {
    key: "electricity",
    label: "Electricity Bill Payment",
    categoryAliases: ["electricity"],
  },
  {
    key: "water",
    label: "Water Bill Payment",
    categoryAliases: ["water"],
  },
  {
    key: "insurance",
    label: "Insurance Premium Payment",
    categoryAliases: ["insurance", "life insurance", "health insurance"],
  },
  {
    key: "gas",
    label: "Piped Gas Bill Payment",
    categoryAliases: ["piped gas", "png"],
  },
  {
    key: "lpg",
    label: "LPG Gas Payment",
    categoryAliases: ["lpg gas", "lpg"],
  },
];

@Injectable()
export class RetailerService {
  constructor(
    private readonly wallets: WalletService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(DocumentRecord.name)
    private readonly documentModel: Model<DocumentRecord>,
    @InjectModel(LocationRecord.name)
    private readonly locationModel: Model<LocationRecord>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(WalletLoadRequest.name)
    private readonly walletLoadRequestModel: Model<WalletLoadRequest>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTxnModel: Model<WalletTransaction>,
    @InjectModel(BbpsTransaction.name)
    private readonly txnModel: Model<BbpsTransaction>,
    @InjectModel(BbpsCategory.name)
    private readonly categoryModel: Model<BbpsCategory>,
    @InjectModel(BbpsBiller.name)
    private readonly billerModel: Model<BbpsBiller>,
    @InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
    @InjectModel(TdsReport.name) private readonly tdsModel: Model<TdsReport>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  async overview(userId: string) {
    const objectId = new Types.ObjectId(userId);
    const [
      user,
      mainWallet,
      commissionWallet,
      txns,
      walletHistory,
      ledgers,
      notifications,
    ] = await Promise.all([
      this.userModel.findById(objectId).lean(),
      this.wallets.ensureWallet(objectId, "main"),
      this.wallets.ensureWallet(objectId, "commission"),
      this.txnModel
        .find({ retailerId: objectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      this.walletTxnModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      this.ledgerModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      this.notificationModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);
    if (!user) throw new NotFoundException("Retailer not found");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayTxns = txns.filter(
      (txn: any) => new Date(txn.createdAt ?? 0) >= startOfDay,
    );
    const success = txns.filter((txn) => txn.status === "success");
    const pending = txns.filter((txn) => txn.status === "pending");
    const failed = txns.filter(
      (txn) => txn.status === "failed" || txn.status === "refunded",
    );
    const totalCommission = txns.reduce(
      (sum, txn) => sum + Number(txn.retailerCommission ?? 0),
      0,
    );
    const totalTds = txns.reduce(
      (sum, txn) => sum + Number(txn.tdsAmount ?? 0),
      0,
    );
    const todayEarnings = todayTxns.reduce(
      (sum, txn) =>
        sum + Number(txn.retailerCommission ?? 0) - Number(txn.tdsAmount ?? 0),
      0,
    );
    const monthlyVolume = txns.reduce(
      (sum, txn) => sum + Number(txn.amount ?? 0),
      0,
    );
    const liveServices = await this.liveServices();

    return {
      profile: this.safeUser(user),
      isRestricted:
        user.approvalStatus !== "approved" ||
        user.kycStatus !== "verified" ||
        !user.isActive,
      wallets: {
        main: mainWallet.balance,
        commission: commissionWallet.balance,
        currency: "INR",
      },
      stats: [
        {
          label: "Main Wallet Balance",
          value: mainWallet.balance,
          type: "currency",
          series: this.seriesFrom(walletHistory, "closingBalance"),
        },
        {
          label: "Commission Wallet",
          value: commissionWallet.balance,
          type: "currency",
          series: this.seriesFrom(walletHistory, "amount"),
        },
        {
          label: "Today Transactions",
          value: todayTxns.length,
          type: "number",
          series: this.seriesFrom(txns, "amount"),
        },
        {
          label: "Success Transactions",
          value: success.length,
          type: "number",
          series: this.seriesFrom(success, "amount"),
        },
        {
          label: "Pending Transactions",
          value: pending.length,
          type: "number",
          series: this.seriesFrom(pending, "amount"),
        },
        {
          label: "Failed Transactions",
          value: failed.length,
          type: "number",
          series: this.seriesFrom(failed, "amount"),
        },
        {
          label: "Today Earnings",
          value: todayEarnings,
          type: "currency",
          series: this.seriesFrom(todayTxns, "retailerCommission"),
        },
        {
          label: "Total Commission",
          value: totalCommission,
          type: "currency",
          series: this.seriesFrom(success, "retailerCommission"),
        },
        {
          label: "Total TDS",
          value: totalTds,
          type: "currency",
          series: this.seriesFrom(success, "tdsAmount"),
        },
        {
          label: "Monthly Volume",
          value: monthlyVolume,
          type: "currency",
          series: this.seriesFrom(txns, "amount"),
        },
      ],
      charts: {
        daily: this.dailyChart(txns),
        serviceWise: liveServices.map((service) => ({
          name: service.label
            .replace(" Bill Payment", "")
            .replace(" Premium Payment", "")
            .replace(" Payment", ""),
          value: txns
            .filter(
              (txn) =>
                txn.serviceCategory === service.key ||
                txn.serviceCategory === service.label,
            )
            .reduce((sum, txn) => sum + Number(txn.retailerCommission ?? 0), 0),
        })),
        walletUsage: this.dailyChart(walletHistory, "amount"),
      },
      transactions: txns.slice(0, 10),
      walletHistory,
      ledgers,
      notifications,
      services: liveServices,
    };
  }

  async profile(userId: string) {
    const objectId = new Types.ObjectId(userId);
    const [user, documents, location] = await Promise.all([
      this.userModel.findById(objectId).lean(),
      this.documentModel.findOne({ userId: objectId }).lean(),
      this.locationModel.findOne({ userId: objectId }).lean(),
    ]);
    if (!user) throw new NotFoundException("Retailer not found");
    return { user: this.safeUser(user), documents, location };
  }

  async transactions(userId: string, query: Record<string, string>) {
    const filter: Record<string, unknown> = {
      retailerId: new Types.ObjectId(userId),
    };
    for (const key of ["serviceCategory", "operator", "status"])
      if (query[key]) filter[key] = query[key];
    return {
      transactions: await this.txnModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
    };
  }

  async transaction(userId: string, transactionId: string) {
    const objectId = new Types.ObjectId(userId);
    const [transaction, ledgers, tds] = await Promise.all([
      this.txnModel.findOne({ retailerId: objectId, transactionId }).lean(),
      this.ledgerModel
        .find({ userId: objectId, transactionId })
        .sort({ createdAt: -1 })
        .lean(),
      this.tdsModel
        .find({ userId: objectId, transactionId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    if (!transaction) throw new NotFoundException("Transaction not found");
    return { transaction, ledgers, tds };
  }

  async wallet(userId: string) {
    const objectId = new Types.ObjectId(userId);
    const [main, commission, history, ledger, loadRequests] = await Promise.all(
      [
        this.wallets.ensureWallet(objectId, "main"),
        this.wallets.ensureWallet(objectId, "commission"),
        this.walletTxnModel
          .find({ userId: objectId })
          .sort({ createdAt: -1 })
          .limit(300)
          .lean(),
        this.ledgerModel
          .find({ userId: objectId })
          .sort({ createdAt: -1 })
          .limit(300)
          .lean(),
        this.walletLoadRequestModel
          .find({ userId: objectId })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      ],
    );
    return {
      wallets: { main: main.balance, commission: commission.balance },
      bankDetails: {
        bankName: "AXIS BANK",
        accountName: "PAYORAMA BILLPAYSHOP PRIVATE LIMITED",
        accountNumber: "920020056409544",
        ifsc: "UTIB0000686",
      },
      loadRequests,
      history,
      ledger,
    };
  }

  async createWalletLoadRequest(
    userId: string,
    input: { amount: number; utrNumber: string; screenshot: string },
  ) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException("Enter a valid wallet load amount");
    const utrNumber = input.utrNumber.trim().toUpperCase();
    if (utrNumber.length < 6)
      throw new BadRequestException("Enter a valid UTR number");
    if (!input.screenshot?.startsWith("data:image/"))
      throw new BadRequestException("Upload a payment screenshot");

    try {
      const request = await this.walletLoadRequestModel.create({
        userId: new Types.ObjectId(userId),
        amount,
        utrNumber,
        screenshot: input.screenshot,
        status: "pending",
      });
      return {
        request,
        message: "Wallet load request submitted for admin approval",
      };
    } catch (error: any) {
      if (error?.code === 11000)
        throw new BadRequestException(
          "This UTR number has already been submitted",
        );
      throw error;
    }
  }

  async reports(userId: string) {
    const objectId = new Types.ObjectId(userId);
    const [transactions, walletHistory, tdsReports] = await Promise.all([
      this.txnModel
        .find({ retailerId: objectId })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      this.walletTxnModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      this.tdsModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
    ]);
    return { transactions, walletHistory, tdsReports };
  }

  async notifications(userId: string) {
    return {
      notifications: await this.notificationModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    };
  }

  async security(userId: string) {
    const objectId = new Types.ObjectId(userId);
    const [devices, sessions] = await Promise.all([
      this.deviceModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      this.sessionModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);
    return { devices, sessions };
  }

  async services() {
    return { services: await this.liveServices() };
  }

  private async liveServices() {
    const categories = await this.categoryModel
      .find({ serviceKey: { $in: services.map((service) => service.key) } })
      .lean();
    const categoryByService = new Map(
      categories.map((category) => [category.serviceKey, category]),
    );

    return Promise.all(
      services.map(async (service) => {
        const category = categoryByService.get(service.key);
        const billers = category
          ? await this.billerModel
              .find({
                categoryKey: category.categoryKey,
                billerStatus: "ACTIVE",
                isAvailable: { $ne: false },
                billerName: { $not: /demo operator/i },
              })
              .sort({ billerName: 1 })
              .lean()
          : [];

        return {
          ...service,
          operators: billers.map((biller) => biller.billerName),
        };
      }),
    );
  }

  private safeUser(user: any) {
    return {
      id: String(user._id),
      name: user.name,
      businessName: user.businessName,
      mobile: user.mobile,
      email: user.email,
      retailerCode: user.retailerCode,
      role: user.role,
      approvalStatus: user.approvalStatus,
      emailVerified: user.emailVerified,
      kycStatus: user.kycStatus,
      isActive: user.isActive,
      address: user.address,
    };
  }

  private seriesFrom(rows: any[], key: string) {
    const values = rows
      .slice(0, 6)
      .reverse()
      .map((row) => Math.max(0, Number(row[key] ?? 0)));
    return values.length ? values : [0, 0, 0, 0, 0, 0];
  }

  private dailyChart(rows: any[], key = "amount") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (day, index) => ({
        day,
        value: rows
          .filter((_, rowIndex) => rowIndex % 7 === index)
          .reduce((sum, row) => sum + Number(row[key] ?? 0), 0),
      }),
    );
  }
}
