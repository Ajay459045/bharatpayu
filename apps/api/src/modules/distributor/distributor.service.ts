import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import { Model, Types } from "mongoose";
import { CommissionService } from "../commission/commission.service";
import { User } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";

@Injectable()
export class DistributorService {
  constructor(
    private readonly users: UsersService,
    private readonly commissions: CommissionService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async retailers(distributorId: string) {
    const retailers = await this.userModel
      .find({
        distributorId: new Types.ObjectId(distributorId),
        role: "retailer",
      })
      .sort({ createdAt: -1 })
      .lean();
    return { retailers };
  }

  async createRetailer(distributorId: string, input: any) {
    const distributor = await this.userModel.findById(distributorId).lean();
    if (
      !distributor ||
      distributor.role !== "distributor" ||
      distributor.approvalStatus !== "approved"
    ) {
      throw new BadRequestException("Approved distributor account is required");
    }
    const retailer = await this.users.createDistributorRetailer({
      distributorId,
      ...input,
      passwordHash: await bcrypt.hash(input.password, 12),
    });
    return { retailer };
  }

  async commissionRules(distributorId: string) {
    return {
      rules: await this.commissions.list({
        scope: "distributor_retailer",
        distributorId,
      }),
    };
  }

  async saveCommissionRule(distributorId: string, input: any) {
    const retailer = await this.userModel
      .findOne({
        _id: new Types.ObjectId(input.retailerId),
        distributorId: new Types.ObjectId(distributorId),
        role: "retailer",
      })
      .lean();
    if (!retailer)
      throw new BadRequestException(
        "Retailer is not linked to this distributor",
      );
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
}
