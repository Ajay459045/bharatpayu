import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import * as nodemailer from "nodemailer";
import { Connection, Model, Types } from "mongoose";
import { nanoid } from "nanoid";
import { ActivityLog } from "../admin/schemas/activity-log.schema";
import { BbpsTransaction } from "../bbps/schemas/bbps-transaction.schema";
import { CommissionService } from "../commission/commission.service";
import { LedgerService } from "../ledger/ledger.service";
import { Ledger } from "../ledger/schemas/ledger.schema";
import { NotificationService } from "../notification/notification.service";
import { User } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import { Wallet } from "../wallet/schemas/wallet.schema";
import { WalletService } from "../wallet/wallet.service";

type RetailerDraft = {
  fullName: string;
  businessName: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  state: string;
  district: string;
  fullAddress: string;
  pincode: string;
  documents: {
    panImage: string;
    aadhaarFront: string;
    aadhaarBack: string;
    selfie: string;
  };
  location: {
    latitude: number;
    longitude: number;
    ipAddress?: string;
    deviceInfo: Record<string, unknown>;
  };
};

const SERVICES = ["electricity", "water", "lpg", "gas", "insurance"];

@Injectable()
export class DistributorService {
  private readonly otpChallenges = new Map<
    string,
    { email: string; otpHash: string; expiresAt: number; distributorId: string }
  >();

  constructor(
    private readonly users: UsersService,
    private readonly commissions: CommissionService,
    private readonly wallets: WalletService,
    private readonly ledgers: LedgerService,
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
    @InjectModel(BbpsTransaction.name)
    private readonly transactionModel: Model<BbpsTransaction>,
  ) {}

  async retailers(distributorId: string) {
    const distributor = await this.distributor(distributorId);
    const retailers =
      distributor.approvalStatus === "approved"
        ? await this.userModel
            .find({
              distributorId: new Types.ObjectId(distributorId),
              role: "retailer",
            })
            .sort({ createdAt: -1 })
            .lean()
        : [];
    const retailerIds = retailers.map((retailer) => retailer._id);
    const [wallets, transactions] = await Promise.all([
      this.walletModel
        .find({ userId: { $in: retailerIds }, type: "main" })
        .lean(),
      this.transactionModel
        .aggregate([
          { $match: { retailerId: { $in: retailerIds } } },
          {
            $group: {
              _id: "$retailerId",
              transactions: { $sum: 1 },
              earnings: { $sum: { $ifNull: ["$retailerCommission", 0] } },
            },
          },
        ])
        .exec(),
    ]);
    return {
      distributor,
      retailers: retailers.map((retailer) => {
        const id = String(retailer._id);
        const wallet = wallets.find((row) => String(row.userId) === id);
        const aggregate = transactions.find((row) => String(row._id) === id);
        return {
          ...retailer,
          walletBalance: wallet?.balance ?? 0,
          transactions: aggregate?.transactions ?? 0,
          earnings: aggregate?.earnings ?? 0,
        };
      }),
    };
  }

  async sendRetailerOtp(
    distributorId: string,
    input: RetailerDraft,
    request?: { ip?: string },
  ) {
    await this.assertApprovedDistributor(distributorId);
    this.validateDraft(input);
    const challengeId = nanoid(24);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    this.otpChallenges.set(challengeId, {
      email: input.email.toLowerCase(),
      otpHash: await bcrypt.hash(otp, 12),
      expiresAt: Date.now() + 10 * 60_000,
      distributorId,
    });
    await this.notifications.enqueue("distributor.retailer.otp", {
      userId: distributorId,
      email: input.email,
      otp,
      channels: ["email"],
    });
    const emailSent = await this.sendRetailerOtpEmail(input.email, otp);
    await this.log(distributorId, "distributor.retailer.otp.sent", request, {
      email: input.email,
      mobile: input.mobile,
      emailSent,
    });
    return {
      challengeId,
      message: emailSent
        ? "Email OTP sent to retailer"
        : "SMTP is not configured. Use testing OTP shown on screen.",
      devOtp:
        emailSent || this.config.get<string>("NODE_ENV") === "production"
          ? undefined
          : otp,
    };
  }

  async createRetailer(
    distributorId: string,
    input: RetailerDraft & { otp: string; challengeId: string },
    request?: { ip?: string },
  ) {
    await this.assertApprovedDistributor(distributorId);
    this.validateDraft(input);
    const challenge = this.otpChallenges.get(input.challengeId);
    if (
      !challenge ||
      challenge.distributorId !== distributorId ||
      challenge.email !== input.email.toLowerCase() ||
      challenge.expiresAt < Date.now() ||
      !(await bcrypt.compare(input.otp, challenge.otpHash))
    ) {
      throw new BadRequestException("Invalid or expired retailer email OTP");
    }
    this.otpChallenges.delete(input.challengeId);

    const retailer = await this.users.createDistributorRetailer({
      distributorId,
      createdById: distributorId,
      ...input,
      passwordHash: await bcrypt.hash(input.password, 12),
      autoApprove: true,
    });
    const retailerId = new Types.ObjectId(String(retailer._id));
    await Promise.all([
      this.wallets.ensureWallet(retailerId, "main"),
      this.wallets.ensureWallet(retailerId, "commission"),
      this.notifications.enqueue("retailer.welcome", {
        userId: String(retailer._id),
        email: retailer.email,
        mobile: retailer.mobile,
        channels: ["email", "push"],
      }),
      this.log(distributorId, "distributor.retailer.created", request, {
        retailerId: String(retailer._id),
        email: retailer.email,
        mobile: retailer.mobile,
      }),
    ]);
    return { retailer };
  }

  async retailer(distributorId: string, retailerId: string) {
    await this.assertApprovedDistributor(distributorId);
    const retailer = await this.assertOwnRetailer(distributorId, retailerId);
    const objectId = new Types.ObjectId(retailerId);
    const [wallets, ledgers, transactions, activities] = await Promise.all([
      this.walletModel.find({ userId: objectId }).lean(),
      this.ledgerModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      this.transactionModel
        .find({ retailerId: objectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      this.activityLogModel
        .find({ "metadata.retailerId": retailerId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);
    return { retailer, wallets, ledgers, transactions, activities };
  }

  async updateRetailer(
    distributorId: string,
    retailerId: string,
    input: any,
    request?: { ip?: string },
  ) {
    await this.assertApprovedDistributor(distributorId);
    await this.assertOwnRetailer(distributorId, retailerId);
    const retailer = await this.userModel.findByIdAndUpdate(
      retailerId,
      {
        name: input.fullName,
        businessName: input.businessName,
        mobile: input.mobile,
        email: input.email?.toLowerCase(),
        address: {
          state: input.state ?? "",
          district: input.district ?? "",
          fullAddress: input.fullAddress ?? "",
          pincode: input.pincode ?? "",
        },
      },
      { new: true },
    );
    await this.log(distributorId, "distributor.retailer.updated", request, {
      retailerId,
    });
    return { retailer };
  }

  async updateRetailerStatus(
    distributorId: string,
    retailerId: string,
    input: { status: "active" | "suspended" },
    request?: { ip?: string },
  ) {
    await this.assertApprovedDistributor(distributorId);
    await this.assertOwnRetailer(distributorId, retailerId);
    const retailer = await this.userModel.findByIdAndUpdate(
      retailerId,
      {
        isActive: input.status === "active",
        approvalStatus: input.status === "active" ? "approved" : "suspended",
      },
      { new: true },
    );
    await this.log(
      distributorId,
      `distributor.retailer.${input.status}`,
      request,
      {
        retailerId,
      },
    );
    return { retailer };
  }

  async resetRetailerPassword(
    distributorId: string,
    retailerId: string,
    input: { password: string },
    request?: { ip?: string },
  ) {
    await this.assertApprovedDistributor(distributorId);
    await this.assertOwnRetailer(distributorId, retailerId);
    const retailer = await this.userModel.findByIdAndUpdate(
      retailerId,
      { passwordHash: await bcrypt.hash(input.password, 12) },
      { new: true },
    );
    await this.log(
      distributorId,
      "distributor.retailer.password_reset",
      request,
      {
        retailerId,
      },
    );
    return { retailer };
  }

  async updateRetailerServices(
    distributorId: string,
    retailerId: string,
    input: { services: Record<string, boolean> },
    request?: { ip?: string },
  ) {
    await this.assertApprovedDistributor(distributorId);
    await this.assertOwnRetailer(distributorId, retailerId);
    const serviceAccess = SERVICES.reduce(
      (next, key) => ({ ...next, [key]: input.services[key] !== false }),
      {},
    );
    const retailer = await this.userModel.findByIdAndUpdate(
      retailerId,
      { serviceAccess },
      { new: true },
    );
    await this.log(
      distributorId,
      "distributor.retailer.services_updated",
      request,
      {
        retailerId,
        serviceAccess,
      },
    );
    return { retailer };
  }

  async topupRetailerWallet(
    distributorId: string,
    retailerId: string,
    input: { amount: number },
    request?: { ip?: string },
  ) {
    await this.assertApprovedDistributor(distributorId);
    await this.assertOwnRetailer(distributorId, retailerId);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Enter a valid amount");
    }
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const referenceId = `DTOP${Date.now()}${nanoid(6).toUpperCase()}`;
      const distributorObjectId = new Types.ObjectId(distributorId);
      const retailerObjectId = new Types.ObjectId(retailerId);
      const debited = await this.wallets.debit(
        distributorObjectId,
        "main",
        amount,
        referenceId,
        "Distributor wallet transfer to retailer",
        session,
      );
      const credited = await this.wallets.credit(
        retailerObjectId,
        "main",
        amount,
        referenceId,
        "Wallet topup by distributor",
        session,
      );
      await this.ledgers.create(
        {
          userId: distributorObjectId,
          transactionId: referenceId,
          openingBalance: debited.balance + amount,
          debit: amount,
          credit: 0,
          commission: 0,
          tds: 0,
          closingBalance: debited.balance,
          ipAddress: request?.ip,
        },
        session,
      );
      await this.ledgers.create(
        {
          userId: retailerObjectId,
          transactionId: referenceId,
          openingBalance: credited.balance - amount,
          debit: 0,
          credit: amount,
          commission: 0,
          tds: 0,
          closingBalance: credited.balance,
          ipAddress: request?.ip,
        },
        session,
      );
      await this.log(
        distributorId,
        "distributor.retailer.wallet_topup",
        request,
        {
          retailerId,
          amount,
          referenceId,
        },
      );
      await session.commitTransaction();
      return {
        referenceId,
        distributorWallet: debited,
        retailerWallet: credited,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async commissionRules(distributorId: string) {
    await this.assertApprovedDistributor(distributorId);
    return {
      rules: await this.commissions.list({
        scope: "distributor_retailer",
        distributorId,
      }),
    };
  }

  async saveCommissionRule(distributorId: string, input: any) {
    await this.assertApprovedDistributor(distributorId);
    const retailer = await this.userModel
      .findOne({
        _id: new Types.ObjectId(input.retailerId),
        distributorId: new Types.ObjectId(distributorId),
        role: "retailer",
      })
      .lean();
    if (!retailer) {
      throw new BadRequestException(
        "Retailer is not linked to this distributor",
      );
    }
    const rule = await this.commissions.save({
      ...input,
      scope: "distributor_retailer",
      distributorId,
      distributorType: "flat",
      distributorValue: 0,
      adminType: "flat",
      adminValue: 0,
    });
    return { rule };
  }

  private validateDraft(input: RetailerDraft) {
    if (input.password !== input.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }
    const requiredText: Array<[keyof RetailerDraft, string]> = [
      ["fullName", "Full name"],
      ["businessName", "Business name"],
      ["mobile", "Mobile number"],
      ["email", "Email address"],
      ["password", "Password"],
      ["confirmPassword", "Confirm password"],
      ["state", "State"],
      ["district", "District"],
      ["fullAddress", "Full address"],
      ["pincode", "Pincode"],
    ];
    for (const [key, label] of requiredText) {
      if (!String(input[key] ?? "").trim()) {
        throw new BadRequestException(`${label} is required`);
      }
    }
    if (!/^[6-9]\d{9}$/.test(input.mobile)) {
      throw new BadRequestException("Enter a valid 10 digit mobile number");
    }
    if (!/^\d{6}$/.test(input.pincode)) {
      throw new BadRequestException("Enter a valid 6 digit pincode");
    }
    if (!input.documents?.panImage) {
      throw new BadRequestException("PAN card image is required");
    }
    if (!input.documents?.aadhaarFront) {
      throw new BadRequestException("Aadhaar front image is required");
    }
    if (!input.documents?.aadhaarBack) {
      throw new BadRequestException("Aadhaar back image is required");
    }
    if (!input.documents?.selfie) {
      throw new BadRequestException("User selfie is required");
    }
    if (
      !Number(input.location?.latitude) ||
      !Number(input.location?.longitude)
    ) {
      throw new BadRequestException("Location capture is required");
    }
    if (!input.location?.deviceInfo) {
      throw new BadRequestException("Device information is required");
    }
  }

  private async sendRetailerOtpEmail(email: string, otp: string) {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    if (!host || !user || !pass || user === "replace" || pass === "replace") {
      return false;
    }
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>("SMTP_PORT", "465")),
      secure: this.config.get<string>("SMTP_SECURE", "true") !== "false",
      connectionTimeout: Number(
        this.config.get<string>("SMTP_CONNECTION_TIMEOUT", "8000"),
      ),
      greetingTimeout: Number(
        this.config.get<string>("SMTP_GREETING_TIMEOUT", "8000"),
      ),
      socketTimeout: Number(
        this.config.get<string>("SMTP_SOCKET_TIMEOUT", "12000"),
      ),
      auth: { user, pass },
    });
    try {
      await transporter.sendMail({
        from: this.config.get<string>("SMTP_FROM", `BharatPayU <${user}>`),
        to: email,
        subject: "Verify retailer onboarding OTP",
        text: `Your BharatPayU retailer onboarding OTP is ${otp}. It expires in 10 minutes.`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#03091f;color:#f8fafc;padding:28px">
          <div style="max-width:520px;margin:auto;background:#071238;border:1px solid #1d4ed8;border-radius:12px;padding:28px">
            <h2 style="margin:0 0 12px;color:#ffffff">BharatPayU Retailer Verification</h2>
            <p style="color:#cbd5e1">Use this OTP to complete distributor retailer onboarding.</p>
            <div style="font-size:32px;letter-spacing:8px;font-weight:800;color:#60a5fa;margin:24px 0">${otp}</div>
            <p style="color:#94a3b8;font-size:13px">This OTP expires in 10 minutes.</p>
          </div>
        </div>
      `,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async distributor(distributorId: string) {
    const distributor = await this.userModel.findById(distributorId).lean();
    if (!distributor || distributor.role !== "distributor") {
      throw new BadRequestException("Distributor account is required");
    }
    return distributor;
  }

  private async assertApprovedDistributor(distributorId: string) {
    const distributor = await this.distributor(distributorId);
    if (distributor.approvalStatus !== "approved" || !distributor.isActive) {
      throw new BadRequestException("Approved distributor account is required");
    }
    return distributor;
  }

  private async assertOwnRetailer(distributorId: string, retailerId: string) {
    const retailer = await this.userModel
      .findOne({
        _id: new Types.ObjectId(retailerId),
        distributorId: new Types.ObjectId(distributorId),
        role: "retailer",
      })
      .lean();
    if (!retailer) {
      throw new BadRequestException(
        "Retailer is not linked to this distributor",
      );
    }
    return retailer;
  }

  private log(
    distributorId: string,
    action: string,
    request: { ip?: string } | undefined,
    metadata: Record<string, unknown>,
  ) {
    return this.activityLogModel.create({
      userId: new Types.ObjectId(distributorId),
      action,
      ipAddress: request?.ip,
      metadata,
    });
  }
}
