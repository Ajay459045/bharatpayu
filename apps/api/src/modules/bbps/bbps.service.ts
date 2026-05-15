import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
  private readonly supportedCategories = [
    {
      serviceKey: "electricity",
      aliases: ["electricity"],
    },
    {
      serviceKey: "water",
      aliases: ["water"],
    },
    {
      serviceKey: "insurance",
      aliases: ["insurance", "life insurance", "health insurance"],
    },
    {
      serviceKey: "gas",
      aliases: ["piped gas", "png"],
    },
    {
      serviceKey: "lpg",
      aliases: ["lpg gas", "lpg"],
    },
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
    private readonly config: ConfigService,
  ) {}

  async categories() {
    const cached = await this.categoryModel
      .find({ serviceKey: { $in: this.supportedServiceKeys() } })
      .sort({ serviceKey: 1 })
      .lean();
    if (cached.length && this.hasSupportedCategories(cached)) {
      return { categories: cached };
    }
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
    const rows = this.extractRows(response, [
      "data",
      "categories",
      "categoryList",
      "billerCategory",
      "result",
    ]);
    const supportedRows = this.mapSupportedCategoryRows(rows);
    await Promise.all(
      supportedRows.map(({ row, serviceKey }) =>
        this.categoryModel.findOneAndUpdate(
          { serviceKey },
          {
            categoryKey: this.pickString(row, [
              "categoryKey",
              "categoryId",
              "id",
              "key",
            ]),
            categoryName: this.pickString(row, ["categoryName", "name"]),
            serviceKey,
            iconUrl: row.iconUrl,
            billerList: row.billerList ?? row.billerCount ?? 0,
            syncedAt: new Date(),
          },
          { upsert: true, new: true },
        ),
      ),
    );
    return this.categoryModel
      .find({ serviceKey: { $in: this.supportedServiceKeys() } })
      .sort({ serviceKey: 1 })
      .lean();
  }

  async billers(categoryKey: string, forceSync = false) {
    const cached = await this.billerModel
      .find({
        categoryKey,
        billerStatus: "ACTIVE",
        isAvailable: { $ne: false },
      })
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
    const rows = this.extractRows(response, [
      "data",
      "billers",
      "billerList",
      "biller",
      "result",
    ]);
    await Promise.all(
      rows
        .filter(
          (row: any) =>
            this.pickString(row, ["billerId", "id"]) &&
            this.pickString(row, ["billerName", "name"]) &&
            row.isAvailable !== false,
        )
        .map((row: any) =>
          this.billerModel.findOneAndUpdate(
            { billerId: this.pickString(row, ["billerId", "id"]) },
            {
              billerId: this.pickString(row, ["billerId", "id"]),
              billerName: this.pickString(row, ["billerName", "name"]),
              categoryKey: row.categoryKey ?? categoryKey,
              categoryName: row.categoryName,
              type: row.type,
              coverageCity: String(row.coverageCity ?? ""),
              coverageState: String(row.coverageState ?? ""),
              coveragePincode:
                row.coveragePincode === undefined ||
                row.coveragePincode === null
                  ? undefined
                  : String(row.coveragePincode),
              updatedDate: row.updatedDate,
              billerStatus: row.billerStatus ?? "ACTIVE",
              isAvailable: row.isAvailable !== false,
              iconUrl: row.iconUrl,
              syncedAt: new Date(),
            },
            { upsert: true, new: true },
          ),
        ),
    );
    return {
      billers: await this.billerModel
        .find({
          categoryKey,
          billerStatus: "ACTIVE",
          isAvailable: { $ne: false },
        })
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
    const billerDetail = this.extractBillerDetail(response);
    await this.apiLogModel.create({
      provider: "digiseva",
      endpoint: "BillerDetails",
      direction: "response",
      payload: response,
    });
    const parameters = this.normalizeParameters(
      this.extractRows(billerDetail, [
        "parameters",
        "inputParameters",
        "inputParams",
        "customerParams",
        "params",
        "fields",
      ]),
    );
    const details = await this.detailModel.findOneAndUpdate(
      { billerId },
      { billerId, parameters, raw: billerDetail, syncedAt: new Date() },
      { upsert: true, new: true },
    );
    return { details };
  }

  async fetchBill(
    dto: FetchBillDto,
    retailerId: string,
    request?: { ip?: string },
  ) {
    const retailer = await this.assertRetailerCanTransact(retailerId);
    this.assertRetailerServiceAccess(retailer, dto.categoryName);
    const details = await this.billerDetails(dto.billerId);
    const billerDetail = (details.details?.raw ?? {}) as Record<string, any>;
    const inputParameters = this.normalizeFetchInputParameters(
      details.details?.parameters ?? [],
      dto.inputParameters,
      retailer,
    );
    this.validateInputParameters(
      details.details?.parameters ?? [],
      inputParameters,
    );
    const externalRef = `BPUFETCH${Date.now()}${nanoid(6).toUpperCase()}`;
    const initChannel = this.resolveInitChannel(billerDetail);
    const payload = {
      billerId: dto.billerId,
      initChannel,
      externalRef,
      inputParameters: this.buildInputParametersPayload(inputParameters),
      deviceInfo: this.buildDeviceInfo(
        retailer,
        dto.deviceInfo,
        billerDetail,
        initChannel,
        request,
      ),
      remarks: this.buildRemarksPayload(),
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
    return this.normalizeBill({ ...dto, inputParameters }, bill, externalRef);
  }

  async payBill(
    dto: PayBillDto,
    retailerId: string,
    request?: { ip?: string },
  ) {
    const retailer = await this.assertRetailerCanTransact(retailerId);
    this.assertRetailerServiceAccess(retailer, dto.serviceCategory);
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

  private normalizeFetchInputParameters(
    parameters: Array<Record<string, unknown>>,
    input: Record<string, string>,
    retailer: Record<string, any>,
  ) {
    const consumerNumber =
      input.consumerNumber ?? input.ConsumerNumber ?? input.consumer_number;
    const normalized = { ...input };
    const firstCustomerParameter = parameters.find(
      (parameter) => !this.isMobileParameter(parameter),
    );
    const firstParameterName = String(
      firstCustomerParameter?.name ?? parameters[0]?.name ?? "",
    );
    if (
      consumerNumber &&
      firstParameterName &&
      !normalized[firstParameterName]
    ) {
      normalized[firstParameterName] = consumerNumber;
    }

    for (const parameter of parameters) {
      const name = String(parameter.name ?? "");
      if (!name || normalized[name] || !this.isMobileParameter(parameter)) {
        continue;
      }
      normalized[name] = String(retailer.mobile ?? "");
    }

    return normalized;
  }

  private buildInputParametersPayload(input: Record<string, string>) {
    const payload: Record<string, string> = {};
    for (let index = 1; index <= 7; index += 1) {
      const key = `param${index}`;
      if (input[key] !== undefined) payload[key] = String(input[key]);
    }
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith("param")) continue;
      payload[key] = String(value);
    }
    return payload;
  }

  private buildRemarksPayload() {
    const remarks: Record<string, number> = {};
    for (let index = 1; index <= 7; index += 1) {
      remarks[`param${index}`] = 0;
    }
    return remarks;
  }

  private resolveInitChannel(billerDetail: Record<string, any>) {
    const configured = this.config.get<string>("DIGISEVA_INIT_CHANNEL", "AGT");
    const channels = Array.isArray(billerDetail.initChannels)
      ? billerDetail.initChannels
      : [];
    const hasConfigured = channels.some(
      (channel) =>
        String(channel.name ?? "").toUpperCase() === configured.toUpperCase(),
    );
    if (hasConfigured) return configured.toUpperCase();
    return String(channels[0]?.name ?? configured).toUpperCase();
  }

  private buildDeviceInfo(
    retailer: Record<string, any>,
    dtoDeviceInfo?: Record<string, unknown>,
    billerDetail: Record<string, any> = {},
    initChannel = "AGT",
    request?: { ip?: string },
  ) {
    const channel = this.findInitChannel(billerDetail, initChannel);
    const requiredFields = Array.isArray(channel?.deviceInfo)
      ? channel.deviceInfo
      : [];
    const location =
      (retailer.kyc?.location as Record<string, unknown> | undefined) ?? {};
    const latitude =
      dtoDeviceInfo?.latitude ?? dtoDeviceInfo?.lat ?? location.latitude;
    const longitude =
      dtoDeviceInfo?.longitude ?? dtoDeviceInfo?.lng ?? location.longitude;
    const geoCode =
      dtoDeviceInfo?.geoCode ??
      (latitude && longitude
        ? `${latitude},${longitude}`
        : this.config.get<string>("DIGISEVA_AGENT_GEOCODE", "28.6326,77.2175"));

    const values: Record<string, string> = {
      terminalId: String(
        dtoDeviceInfo?.terminalId ??
          this.config.get<string>("DIGISEVA_TERMINAL_ID") ??
          this.numericTerminalId(retailer.retailerCode) ??
          "123456",
      ),
      mobile: String(
        dtoDeviceInfo?.mobile ??
          retailer.mobile ??
          this.config.get<string>("DIGISEVA_AGENT_MOBILE", "9999999999"),
      ),
      postalCode: String(
        dtoDeviceInfo?.postalCode ??
          dtoDeviceInfo?.pincode ??
          retailer.address?.pincode ??
          this.config.get<string>("DIGISEVA_AGENT_PINCODE", "110001"),
      ),
      geoCode: String(geoCode),
      ip: String(dtoDeviceInfo?.ip ?? request?.ip ?? "127.0.0.1"),
      mac: String(dtoDeviceInfo?.mac ?? "00:00:00:00:00:00"),
    };

    if (!requiredFields.length) {
      return initChannel === "AGT"
        ? {
            terminalId: values.terminalId,
            mobile: values.mobile,
            postalCode: values.postalCode,
            geoCode: values.geoCode,
          }
        : { ip: values.ip, mac: values.mac };
    }

    return requiredFields.reduce(
      (deviceInfo: Record<string, string>, field: Record<string, unknown>) => {
        const name = String(field.name ?? "");
        if (name && values[name]) deviceInfo[name] = values[name];
        return deviceInfo;
      },
      {},
    );
  }

  private findInitChannel(
    billerDetail: Record<string, any>,
    initChannel: string,
  ) {
    const channels = Array.isArray(billerDetail.initChannels)
      ? billerDetail.initChannels
      : [];
    return channels.find(
      (channel) =>
        String(channel.name ?? "").toUpperCase() === initChannel.toUpperCase(),
    );
  }

  private numericTerminalId(value?: string) {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits ? digits.slice(0, 10) : undefined;
  }

  private extractRows(payload: any, keys: string[]): any[] {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        const nested = this.extractRows(value, keys);
        if (nested.length) return nested;
      }
    }
    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) return value;
    }
    return [];
  }

  private extractBillerDetail(payload: any) {
    return (
      payload?.data?.data?.data ??
      payload?.data?.data ??
      payload?.data ??
      payload
    );
  }

  private normalizeParameters(parameters: Array<Record<string, unknown>>) {
    return parameters
      .map((parameter) => {
        const name = this.pickString(parameter, [
          "name",
          "paramName",
          "parameterName",
          "key",
        ]);
        const desc =
          this.pickString(parameter, [
            "desc",
            "description",
            "displayName",
            "label",
          ]) || name;
        if (!name) return undefined;
        return {
          ...parameter,
          name,
          desc,
          mandatory:
            parameter.mandatory ??
            parameter.isMandatory ??
            parameter.required ??
            0,
          regex: parameter.regex ?? parameter.pattern ?? parameter.regEx,
        };
      })
      .filter(Boolean);
  }

  private isMobileParameter(parameter: Record<string, unknown>) {
    const text = this.normalizeName(
      [
        parameter.name,
        parameter.desc,
        parameter.description,
        parameter.displayName,
        parameter.label,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return text.includes("mobile");
  }

  private pickString(row: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return "";
  }

  private mapSupportedCategoryRows(rows: Array<Record<string, unknown>>) {
    return this.supportedCategories
      .map((service) => {
        const row =
          rows.find((category) =>
            this.categoryMatchesService(category, service.aliases, "exact"),
          ) ??
          rows.find((category) =>
            this.categoryMatchesService(category, service.aliases, "contains"),
          );
        return row ? { serviceKey: service.serviceKey, row } : undefined;
      })
      .filter(Boolean) as Array<{
      serviceKey: string;
      row: Record<string, unknown>;
    }>;
  }

  private categoryMatchesService(
    category: Record<string, unknown>,
    aliases: string[],
    mode: "exact" | "contains",
  ) {
    const categoryName = this.normalizeName(
      this.pickString(category, ["categoryName", "name"]),
    );
    return aliases.some((alias) => {
      const normalizedAlias = this.normalizeName(alias);
      return mode === "exact"
        ? categoryName === normalizedAlias
        : categoryName.includes(normalizedAlias);
    });
  }

  private supportedServiceKeys() {
    return this.supportedCategories.map((category) => category.serviceKey);
  }

  private normalizeName(value: string) {
    return value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
  }

  private hasSupportedCategories(categories: Array<Record<string, unknown>>) {
    const serviceKeys = new Set(
      categories.map((category) => String(category.serviceKey ?? "")),
    );
    return this.supportedCategories.every((category) =>
      serviceKeys.has(category.serviceKey),
    );
  }

  private serviceKeyFromName(value?: string) {
    const normalized = this.normalizeName(String(value ?? ""));
    return this.supportedCategories.find((category) =>
      category.aliases.some((alias) => {
        const normalizedAlias = this.normalizeName(alias);
        return (
          normalized === normalizedAlias || normalized.includes(normalizedAlias)
        );
      }),
    )?.serviceKey;
  }

  private assertRetailerServiceAccess(
    retailer: Record<string, any>,
    serviceName?: string,
  ) {
    const serviceKey = this.serviceKeyFromName(serviceName);
    if (serviceKey && retailer.serviceAccess?.[serviceKey] === false) {
      throw new ForbiddenException(
        `${serviceName} service is disabled by your distributor.`,
      );
    }
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
    return user;
  }
}
