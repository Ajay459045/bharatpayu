import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import { nanoid } from "nanoid";
import { CommissionService } from "../commission/commission.service";
import { LedgerService } from "../ledger/ledger.service";
import { NotificationService } from "../notification/notification.service";
import { TdsService } from "../tds/tds.service";
import { UsersService } from "../users/users.service";
import { WalletService } from "../wallet/wallet.service";
import { DigiSevaClient } from "./digiseva.client";
import { FetchBillDto } from "./dto/fetch-bill.dto";
import { PayBillDto } from "./dto/pay-bill.dto";
import { AdminSettlementRequest } from "./schemas/admin-settlement-request.schema";
import { ApiLog } from "./schemas/api-log.schema";
import { BbpsBiller } from "./schemas/bbps-biller.schema";
import { BbpsBillerDetail } from "./schemas/bbps-biller-detail.schema";
import { BbpsCategory } from "./schemas/bbps-category.schema";
import { BbpsTransaction } from "./schemas/bbps-transaction.schema";

@Injectable()
export class BbpsService {
  private readonly supportedCategoryAliases = [
    ["electricity"],
    ["water"],
    ["insurance", "life insurance", "health insurance"],
    ["piped gas", "png"],
    ["lpg gas", "lpg"],
  ];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(BbpsTransaction.name)
    private readonly txnModel: Model<BbpsTransaction>,
    @InjectModel(AdminSettlementRequest.name)
    private readonly settlementModel: Model<AdminSettlementRequest>,
    @InjectModel(BbpsCategory.name)
    private readonly categoryModel: Model<BbpsCategory>,
    @InjectModel(BbpsBiller.name)
    private readonly billerModel: Model<BbpsBiller>,
    @InjectModel(BbpsBillerDetail.name)
    private readonly detailModel: Model<BbpsBillerDetail>,
    @InjectModel(ApiLog.name) private readonly apiLogModel: Model<ApiLog>,
    private readonly digiseva: DigiSevaClient,
    private readonly wallets: WalletService,
    private readonly commissions: CommissionService,
    private readonly tds: TdsService,
    private readonly ledgers: LedgerService,
    private readonly notifications: NotificationService,
    private readonly users: UsersService,
  ) {}

  async categories() {
    const cached = await this.categoryModel
      .find()
      .sort({ categoryName: 1 })
      .lean();
    if (cached.length && this.hasSupportedCategories(cached))
      return { categories: cached };
    return { categories: await this.syncCategories() };
  }

  async syncCategories() {
    const response = await this.digiseva.categories();
    await this.apiLogModel.create({
      provider: "digiseva",
      endpoint: "BillerCategory",
      direction: "response",
      payload: response,
    });
    const rows = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.categories)
        ? response.categories
        : [];
    await Promise.all(
      rows
        .filter(
          (row: any) =>
            (row.categoryKey ?? row.categoryId ?? row.id) &&
            (row.categoryName ?? row.name),
        )
        .map((row: any) =>
          this.categoryModel.findOneAndUpdate(
            { categoryKey: row.categoryKey ?? row.categoryId ?? row.id },
            {
              categoryKey: row.categoryKey ?? row.categoryId ?? row.id,
              categoryName: row.categoryName ?? row.name,
              iconUrl: row.iconUrl,
              billerList: row.billerList ?? row.billerCount ?? 0,
              syncedAt: new Date(),
            },
            { upsert: true, new: true },
          ),
        ),
    );
    return this.categoryModel.find().sort({ categoryName: 1 }).lean();
  }

  async billers(categoryKey: string, forceSync = false) {
    const cached = await this.billerModel
      .find({ categoryKey, billerStatus: "ACTIVE" })
      .sort({ billerName: 1 })
      .lean();
    const freshEnough = cached.some(
      (row) =>
        row.syncedAt &&
        Date.now() - new Date(row.syncedAt).getTime() < 6 * 60 * 60 * 1000,
    );
    if (cached.length && freshEnough && !forceSync) return { billers: cached };

    const response = await this.digiseva.billers(categoryKey);
    await this.apiLogModel.create({
      provider: "digiseva",
      endpoint: "BillerList",
      direction: "response",
      payload: response,
    });
    const rows = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.billers)
        ? response.billers
        : [];
    await Promise.all(
      rows
        .filter((row: any) => (row.billerId ?? row.id) && (row.billerName ?? row.name))
        .map((row: any) =>
          this.billerModel.findOneAndUpdate(
            { billerId: row.billerId ?? row.id },
            {
              billerId: row.billerId ?? row.id,
              billerName: row.billerName ?? row.name,
              categoryKey: row.categoryKey ?? categoryKey,
              type: row.type,
              billerStatus: row.billerStatus ?? "ACTIVE",
              syncedAt: new Date(),
            },
            { upsert: true, new: true },
          ),
        ),
    );
    return {
      billers: await this.billerModel
        .find({ categoryKey, billerStatus: "ACTIVE" })
        .sort({ billerName: 1 })
        .lean(),
    };
  }

  async billerDetails(billerId: string) {
    const cached = await this.detailModel.findOne({ billerId }).lean();
    if (
      cached &&
      cached.syncedAt &&
      Date.now() - new Date(cached.syncedAt).getTime() < 6 * 60 * 60 * 1000
    ) {
      return { details: cached };
    }
    const response = await this.digiseva.billerDetails(billerId);
    await this.apiLogModel.create({
      provider: "digiseva",
      endpoint: "BillerDetails",
      direction: "response",
      payload: response,
    });
    const parameters = Array.isArray(response?.parameters)
      ? response.parameters
      : Array.isArray(response?.data?.parameters)
        ? response.data.parameters
        : [];
    const details = await this.detailModel.findOneAndUpdate(
      { billerId },
      { billerId, parameters, raw: response, syncedAt: new Date() },
      { upsert: true, new: true },
    );
    return { details };
  }

  async fetchBill(
    dto: FetchBillDto,
    retailerId: string,
    request?: { ip?: string },
  ) {
    await this.assertRetailerCanTransact(retailerId);
    const details = await this.billerDetails(dto.billerId);
    this.validateInputParameters(
      details.details?.parameters ?? [],
      dto.inputParameters,
    );
    const externalRef = `BPUFETCH${Date.now()}${nanoid(6).toUpperCase()}`;
    const payload = {
      billerId: dto.billerId,
      billerName: dto.billerName,
      initChannel: "AGT",
      externalRef,
      inputParameters: dto.inputParameters,
      deviceInfo: {
        ip: request?.ip ?? dto.deviceInfo?.ip ?? "127.0.0.1",
        mac: dto.deviceInfo?.mac ?? "00:00:00:00:00:00",
      },
      remarks: { param1: 0 },
      transactionAmount: 0,
    };
    await this.apiLogModel.create({
      provider: "digiseva",
      endpoint: "FetchBillDetails",
      direction: "request",
      payload,
    });
    const bill = await this.digiseva.fetchBill(payload);
    await this.apiLogModel.create({
      provider: "digiseva",
      endpoint: "FetchBillDetails",
      direction: "response",
      payload: bill,
    });
    return this.normalizeBill(dto, bill, externalRef);
  }

  async payBill(
    dto: PayBillDto,
    retailerId: string,
    request?: { ip?: string },
  ) {
    await this.assertRetailerCanTransact(retailerId);
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException("Enter a valid bill amount");
    const idempotencyKey = dto.idempotencyKey ?? nanoid(32);
    const existing = await this.txnModel.findOne({ idempotencyKey }).lean();
    if (existing) return this.retailerReceipt(existing);

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const transactionId = `BPU${Date.now()}${nanoid(6).toUpperCase()}`;
      const retailerObjectId = new Types.ObjectId(retailerId);
      const retailer = await this.users.findById(retailerId);
      const distributorId = retailer?.distributorId
        ? new Types.ObjectId(String(retailer.distributorId))
        : undefined;
      const debitedWallet = await this.wallets.debit(
        retailerObjectId,
        "main",
        amount,
        transactionId,
        "BBPS semi-manual wallet debit",
        session,
      );
      await this.ledgers.create(
        {
          userId: retailerObjectId,
          transactionId,
          openingBalance: debitedWallet.balance + amount,
          debit: amount,
          credit: 0,
          commission: 0,
          tds: 0,
          closingBalance: debitedWallet.balance,
          ipAddress: request?.ip,
          deviceInfo: dto.inputParameters,
        },
        session,
      );
      const [txn] = await this.txnModel.create(
        [
          {
            transactionId,
            idempotencyKey,
            retailerId: retailerObjectId,
            distributorId,
            serviceCategory: dto.serviceCategory,
            categoryKey: dto.categoryKey,
            billerId: dto.billerId,
            operator: dto.operator,
            customerName: dto.customerName,
            consumerNumber: dto.consumerNumber,
            billNumber: dto.billNumber,
            inputParameters: dto.inputParameters ?? {},
            amount,
            dueDate: dto.dueDate
              ? new Date(dto.dueDate)
              : new Date(Date.now() + 86400000 * 7),
            status: "success",
            settlementStatus: "pending_approval",
            apiResponse: {
              externalRef: dto.externalRef,
              internalMessage: "Processing by BharatPayU",
              providerPayment: "BharatPayU wallet",
            },
          },
        ],
        { session },
      );
      const [settlement] = await this.settlementModel.create(
        [
          {
            transactionMongoId: txn._id,
            transactionId,
            retailerId: retailerObjectId,
            distributorId,
            customerName: dto.customerName,
            consumerNumber: dto.consumerNumber,
            operator: dto.operator,
            serviceCategory: dto.serviceCategory,
            amount,
            walletStatus: "debited",
            status: "pending_approval",
          },
        ],
        { session },
      );
      txn.settlementId = String(settlement._id);
      await txn.save({ session });
      await session.commitTransaction();
      await this.notifications.enqueue("settlement.requested", {
        userId: retailerId,
        transactionId,
        amount,
        channels: ["push", "email"],
      });
      return this.retailerReceipt(txn);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async approveSettlement(
    id: string,
    input: { bbpsReferenceId?: string; notes?: string; reviewerId?: string },
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const settlement = await this.settlementModel
        .findById(id)
        .session(session);
      if (!settlement)
        throw new BadRequestException("Settlement request not found");
      if (settlement.status === "final_success") return settlement;
      const txn = await this.txnModel
        .findOne({ transactionId: settlement.transactionId })
        .session(session);
      if (!txn) throw new BadRequestException("Transaction not found");
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
          session,
        );
        await this.tds.create(
          txn.retailerId,
          commission.retailerCommission,
          txn.transactionId,
          session,
        );
        await this.ledgers.create(
          {
            userId: txn.retailerId,
            transactionId: txn.transactionId,
            openingBalance: wallet.balance - retailerTds.netCommission,
            debit: 0,
            credit: retailerTds.netCommission,
            commission: retailerTds.netCommission,
            tds: retailerTds.tdsAmount,
            closingBalance: wallet.balance,
          },
          session,
        );
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
          session,
        );
        await this.tds.create(
          txn.distributorId,
          commission.distributorCommission,
          txn.transactionId,
          session,
        );
        await this.ledgers.create(
          {
            userId: txn.distributorId,
            transactionId: txn.transactionId,
            openingBalance: wallet.balance - distributorTds.netCommission,
            debit: 0,
            credit: distributorTds.netCommission,
            commission: distributorTds.netCommission,
            tds: distributorTds.tdsAmount,
            closingBalance: wallet.balance,
          },
          session,
        );
      }
      txn.settlementStatus = "final_success";
      txn.bbpsReferenceId = input.bbpsReferenceId;
      txn.settlementNotes = input.notes;
      txn.settledAt = new Date();
      txn.retailerCommission = commission.retailerCommission;
      txn.distributorCommission = commission.distributorCommission;
      txn.tdsAmount = retailerTds.tdsAmount;
      await txn.save({ session });
      settlement.status = "final_success";
      settlement.bbpsReferenceId = input.bbpsReferenceId;
      settlement.notes = input.notes;
      settlement.reviewedBy = input.reviewerId
        ? new Types.ObjectId(input.reviewerId)
        : undefined;
      settlement.settledAt = new Date();
      await settlement.save({ session });
      await session.commitTransaction();
      await this.notifications.enqueue("settlement.final_success", {
        userId: String(txn.retailerId),
        transactionId: txn.transactionId,
        channels: ["push", "email"],
      });
      return settlement;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async rejectSettlement(
    id: string,
    input: { rejectionReason?: string; reviewerId?: string },
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const settlement = await this.settlementModel
        .findById(id)
        .session(session);
      if (!settlement)
        throw new BadRequestException("Settlement request not found");
      if (settlement.status === "rejected") return settlement;
      const txn = await this.txnModel
        .findOne({ transactionId: settlement.transactionId })
        .session(session);
      if (!txn) throw new BadRequestException("Transaction not found");
      const refundedWallet = await this.wallets.credit(
        txn.retailerId,
        "main",
        txn.amount,
        txn.transactionId,
        "Admin rejected BBPS settlement refund",
        session,
      );
      await this.ledgers.create(
        {
          userId: txn.retailerId,
          transactionId: txn.transactionId,
          openingBalance: refundedWallet.balance - txn.amount,
          debit: 0,
          credit: txn.amount,
          commission: 0,
          tds: 0,
          closingBalance: refundedWallet.balance,
        },
        session,
      );
      txn.status = "refunded";
      txn.settlementStatus = "rejected";
      txn.settlementNotes = input.rejectionReason;
      await txn.save({ session });
      settlement.status = "rejected";
      settlement.walletStatus = "refunded";
      settlement.rejectionReason = input.rejectionReason;
      settlement.reviewedBy = input.reviewerId
        ? new Types.ObjectId(input.reviewerId)
        : undefined;
      settlement.settledAt = new Date();
      await settlement.save({ session });
      await session.commitTransaction();
      await this.notifications.enqueue("settlement.rejected", {
        userId: String(txn.retailerId),
        transactionId: txn.transactionId,
        rejectionReason: input.rejectionReason,
        channels: ["push", "email"],
      });
      return settlement;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async holdSettlement(
    id: string,
    input: { notes?: string; reviewerId?: string },
  ) {
    return this.settlementModel.findByIdAndUpdate(
      id,
      {
        status: "hold",
        notes: input.notes,
        reviewedBy: input.reviewerId
          ? new Types.ObjectId(input.reviewerId)
          : undefined,
      },
      { new: true },
    );
  }

  settlements() {
    return this.settlementModel
      .find()
      .populate("retailerId", "name businessName mobile email retailerCode")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
  }

  findTransactions(
    query: Record<string, string>,
    scope?: { retailerId?: string; role?: string },
  ) {
    const filter: Record<string, unknown> = {};
    for (const key of [
      "serviceCategory",
      "operator",
      "status",
      "settlementStatus",
      "retailerId",
      "distributorId",
    ]) {
      if (query[key])
        filter[key] = ["retailerId", "distributorId"].includes(key)
          ? new Types.ObjectId(query[key])
          : query[key];
    }
    if (scope?.role === "retailer" && scope.retailerId)
      filter.retailerId = new Types.ObjectId(scope.retailerId);
    return this.txnModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  }

  private validateInputParameters(
    parameters: Array<Record<string, unknown>>,
    input: Record<string, string>,
  ) {
    for (const parameter of parameters) {
      const name = String(parameter.name ?? "");
      if (!name) continue;
      const value = input[name];
      if (Number(parameter.mandatory ?? 0) === 1 && !value)
        throw new BadRequestException(`${parameter.desc ?? name} is required`);
      if (value && parameter.regex) {
        const regex = new RegExp(String(parameter.regex));
        if (!regex.test(String(value)))
          throw new BadRequestException(`${parameter.desc ?? name} is invalid`);
      }
    }
  }

  private hasSupportedCategories(categories: Array<Record<string, unknown>>) {
    const names = categories.map((category) =>
      String(category.categoryName ?? "").toLowerCase(),
    );
    return this.supportedCategoryAliases.every((aliases) =>
      names.some((name) => aliases.some((alias) => name.includes(alias))),
    );
  }

  private normalizeBill(dto: FetchBillDto, bill: any, externalRef: string) {
    const amount = Number(
      bill.billAmount ??
        bill.amount ??
        bill.transactionAmount ??
        bill.data?.billAmount ??
        0,
    );
    const consumerNumber = String(
      bill.consumerNumber ??
        bill.data?.consumerNumber ??
        Object.values(dto.inputParameters)[0] ??
        "",
    );
    return {
      externalRef,
      billerId: dto.billerId,
      categoryKey: dto.categoryKey,
      serviceCategory: dto.categoryName,
      operator: dto.billerName,
      customerName: bill.customerName ?? bill.data?.customerName ?? "Customer",
      billAmount: amount,
      dueDate:
        bill.dueDate ??
        bill.data?.dueDate ??
        new Date(Date.now() + 86400000 * 7).toISOString(),
      billNumber: bill.billNumber ?? bill.data?.billNumber ?? externalRef,
      consumerNumber,
      inputParameters: dto.inputParameters,
    };
  }

  private retailerReceipt(txn: any) {
    return {
      status: "SUCCESS",
      message: "Processing by BharatPayU",
      transactionId: txn.transactionId,
      amount: txn.amount,
      service: txn.serviceCategory,
      operator: txn.operator,
      customerName: txn.customerName,
      consumerNumber: txn.consumerNumber,
      settlementStatus: txn.settlementStatus,
      time: txn.createdAt ?? new Date(),
    };
  }

  private async assertRetailerCanTransact(retailerId: string) {
    const user = await this.users.findById(retailerId);
    if (!user || user.role !== "retailer")
      throw new ForbiddenException("Retailer account is required");
    if (!user.isActive)
      throw new ForbiddenException("Retailer account is inactive");
    if (user.approvalStatus !== "approved" || user.kycStatus !== "verified") {
      throw new ForbiddenException(
        "Your account is under verification. BBPS services and wallet usage are disabled until admin approval.",
      );
    }
  }
}
