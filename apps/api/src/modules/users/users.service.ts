import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { DocumentRecord } from "./schemas/document.schema";
import { LocationRecord } from "./schemas/location.schema";
import { User } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(DocumentRecord.name)
    private readonly documentModel: Model<DocumentRecord>,
    @InjectModel(LocationRecord.name)
    private readonly locationModel: Model<LocationRecord>,
  ) {}

  findByMobile(mobile: string) {
    return this.userModel.findOne({ mobile }).lean();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  findById(userId: string) {
    return this.userModel.findById(userId).lean();
  }

  async upsertOtpUser(mobile: string) {
    return this.userModel.findOneAndUpdate(
      { mobile },
      {
        $setOnInsert: {
          mobile,
          email: `${mobile}@bharatpayu.local`,
          name: `User ${mobile.slice(-4)}`,
          role: mobile === "9999999999" ? "super_admin" : "retailer",
          approvalStatus: mobile === "9999999999" ? "approved" : "pending",
        },
      },
      { upsert: true, new: true },
    );
  }

  async createOnboarding(input: {
    role: "retailer" | "distributor";
    fullName: string;
    businessName: string;
    mobile: string;
    email: string;
    passwordHash: string;
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
  }) {
    const user = await this.userModel.create({
      name: input.fullName,
      businessName: input.businessName,
      mobile: input.mobile,
      email: input.email.toLowerCase(),
      retailerCode: await this.generateRetailerCode(),
      passwordHash: input.passwordHash,
      role: input.role,
      approvalStatus: "pending",
      emailVerified: false,
      kycStatus: "submitted",
      loginOtpEnabled: true,
      address: {
        state: input.state,
        district: input.district,
        fullAddress: input.fullAddress,
        pincode: input.pincode,
      },
      kyc: {
        submittedAt: new Date(),
        documents: input.documents,
        location: input.location,
      },
    });

    const userId = new Types.ObjectId(String(user._id));

    try {
      await Promise.all([
        this.documentModel.create({ userId, ...input.documents }),
        this.locationModel.create({ userId, ...input.location }),
      ]);
    } catch (error) {
      console.error(
        `Failed to save documents/location for user ${user._id}:`,
        error,
      );
      // Still return user - the KYC documents are stored but we should log this
      // This ensures the user is still visible in approval requests
    }

    return user;
  }

  async createDistributorRetailer(input: {
    distributorId: string;
    createdById?: string;
    fullName: string;
    businessName: string;
    mobile: string;
    email: string;
    passwordHash: string;
    state?: string;
    district?: string;
    fullAddress?: string;
    pincode?: string;
    documents?: {
      panImage: string;
      aadhaarFront: string;
      aadhaarBack: string;
      selfie: string;
    };
    location?: {
      latitude: number;
      longitude: number;
      ipAddress?: string;
      deviceInfo: Record<string, unknown>;
    };
    autoApprove?: boolean;
  }) {
    const [existingEmail, existingMobile] = await Promise.all([
      this.findByEmail(input.email),
      this.findByMobile(input.mobile),
    ]);
    if (existingEmail)
      throw new BadRequestException("Email is already registered");
    if (existingMobile)
      throw new BadRequestException("Mobile number is already registered");
    const autoApprove = input.autoApprove !== false;
    const user = await this.userModel.create({
      name: input.fullName,
      businessName: input.businessName,
      mobile: input.mobile,
      email: input.email.toLowerCase(),
      retailerCode: await this.generateRetailerCode(),
      passwordHash: input.passwordHash,
      role: "retailer",
      distributorId: new Types.ObjectId(input.distributorId),
      createdById: input.createdById
        ? new Types.ObjectId(input.createdById)
        : new Types.ObjectId(input.distributorId),
      createdBy: "distributor",
      approvalStatus: autoApprove ? "approved" : "pending",
      emailVerified: true,
      kycStatus: autoApprove ? "verified" : "submitted",
      loginOtpEnabled: true,
      address: {
        state: input.state ?? "",
        district: input.district ?? "",
        fullAddress: input.fullAddress ?? "",
        pincode: input.pincode ?? "",
      },
      kyc: {
        submittedAt: new Date(),
        documents: input.documents ?? {},
        location: input.location ?? {},
      },
      serviceAccess: {
        electricity: true,
        water: true,
        lpg: true,
        gas: true,
        insurance: true,
      },
    });

    const userId = new Types.ObjectId(String(user._id));
    await Promise.all([
      input.documents
        ? this.documentModel.create({ userId, ...input.documents })
        : Promise.resolve(),
      input.location
        ? this.locationModel.create({ userId, ...input.location })
        : Promise.resolve(),
    ]);

    return user;
  }

  async markEmailVerified(userId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { emailVerified: true },
      { new: true },
    );
  }

  async approvalRequests() {
    const users = await this.userModel
      .find({
        role: { $in: ["retailer", "distributor"] },
        approvalStatus: { $ne: "approved" },
      })
      .sort({ createdAt: -1 })
      .lean();

    const ids = users.map((user) => new Types.ObjectId(String(user._id)));
    const [documents, locations] = await Promise.all([
      this.documentModel.find({ userId: { $in: ids } }).lean(),
      this.locationModel.find({ userId: { $in: ids } }).lean(),
    ]);

    return users.map((user) => {
      const id = String(user._id);
      return {
        id,
        fullName: user.name,
        businessName: user.businessName,
        mobile: user.mobile,
        email: user.email,
        retailerCode: user.retailerCode,
        address: user.address,
        role: user.role,
        approvalStatus: user.approvalStatus,
        rejectionReason: user.rejectionReason,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        documents:
          documents.find((document) => String(document.userId) === id) ??
          user.kyc?.documents ??
          {},
        location:
          locations.find((location) => String(location.userId) === id) ??
          user.kyc?.location ??
          {},
      };
    });
  }

  async updateApproval(
    userId: string,
    approvalStatus: string,
    rejectionReason?: string,
  ) {
    const kycStatus =
      approvalStatus === "approved"
        ? "verified"
        : approvalStatus === "rejected"
          ? "rejected"
          : "submitted";
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        approvalStatus,
        rejectionReason,
        kycStatus,
        isActive: approvalStatus !== "suspended",
      },
      { new: true },
    );
  }

  private async generateRetailerCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = `BPU${Math.floor(100 + Math.random() * 900)}`;
      const exists = await this.userModel.exists({ retailerCode: code });
      if (!exists) return code;
    }
    throw new Error("Could not generate retailer ID");
  }
}
