import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CommissionSlab } from "./schemas/commission-slab.schema";

@Injectable()
export class CommissionService {
  constructor(
    @InjectModel(CommissionSlab.name)
    private readonly slabModel: Model<CommissionSlab>,
  ) {}

  list(query: Record<string, string>) {
    const filter: Record<string, unknown> = {};
    for (const key of [
      "serviceCategory",
      "operator",
      "scope",
      "retailerId",
      "distributorId",
    ]) {
      if (query[key])
        filter[key] = ["retailerId", "distributorId"].includes(key)
          ? new Types.ObjectId(query[key])
          : query[key];
    }
    return this.slabModel
      .find(filter)
      .sort({ serviceCategory: 1, minAmount: 1, createdAt: -1 })
      .limit(500)
      .lean();
  }

  save(input: Partial<CommissionSlab>) {
    const payload = this.normalizeRule(input);
    const id = (input as any)._id;
    if (id)
      return this.slabModel.findByIdAndUpdate(id, payload, {
        new: true,
        upsert: false,
      });
    return this.slabModel.create(payload);
  }

  async remove(id: string) {
    return this.slabModel.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    );
  }

  async calculate(input: {
    serviceCategory: string;
    operator: string;
    amount: number;
    retailerId?: Types.ObjectId;
    distributorId?: Types.ObjectId;
  }) {
    const { serviceCategory, operator, amount, retailerId, distributorId } =
      input;
    const rules = await this.slabModel
      .find({
        active: true,
        serviceCategory,
        operator: { $in: [operator, "ALL"] },
        minAmount: { $lte: amount },
        maxAmount: { $gte: amount },
      })
      .lean();
    const retailerRule = this.pickRule(rules, retailerId, distributorId);
    const distributorRule = this.pickDistributorRule(rules, distributorId);
    return {
      retailerCommission: this.apply(
        retailerRule?.retailerType ?? "percent",
        retailerRule?.retailerValue ?? 2,
        amount,
      ),
      distributorCommission: distributorId
        ? this.apply(
            distributorRule?.distributorType ?? "percent",
            distributorRule?.distributorValue ?? 0,
            amount,
          )
        : 0,
      adminCommission: this.apply(
        distributorRule?.adminType ?? retailerRule?.adminType ?? "percent",
        distributorRule?.adminValue ?? retailerRule?.adminValue ?? 0,
        amount,
      ),
      ruleId: retailerRule?._id ? String(retailerRule._id) : undefined,
      distributorRuleId: distributorRule?._id
        ? String(distributorRule._id)
        : undefined,
    };
  }

  private pickRule(
    rules: any[],
    retailerId?: Types.ObjectId,
    distributorId?: Types.ObjectId,
  ) {
    const retailer = retailerId ? String(retailerId) : "";
    const distributor = distributorId ? String(distributorId) : "";
    return (
      rules.find(
        (rule) =>
          rule.scope === "admin_retailer" &&
          String(rule.retailerId) === retailer,
      ) ??
      rules.find(
        (rule) =>
          rule.scope === "distributor_retailer" &&
          String(rule.retailerId) === retailer &&
          String(rule.distributorId) === distributor,
      ) ??
      rules.find(
        (rule) => rule.scope === "default" && rule.operator !== "ALL",
      ) ??
      rules.find((rule) => rule.scope === "default")
    );
  }

  private pickDistributorRule(rules: any[], distributorId?: Types.ObjectId) {
    const distributor = distributorId ? String(distributorId) : "";
    return (
      rules.find(
        (rule) => rule.scope === "default" && rule.operator !== "ALL",
      ) ??
      rules.find(
        (rule) =>
          rule.scope === "default" &&
          (!rule.distributorId || String(rule.distributorId) === distributor),
      )
    );
  }

  private apply(type: string, value: number, amount: number) {
    const commission =
      type === "flat" ? Number(value) : (amount * Number(value)) / 100;
    return Number(Math.max(0, commission).toFixed(2));
  }

  private normalizeRule(input: Partial<CommissionSlab>) {
    return {
      serviceCategory: input.serviceCategory,
      operator: input.operator || "ALL",
      scope: input.scope || "default",
      retailerId: input.retailerId
        ? new Types.ObjectId(String(input.retailerId))
        : undefined,
      distributorId: input.distributorId
        ? new Types.ObjectId(String(input.distributorId))
        : undefined,
      minAmount: Number(input.minAmount ?? 0),
      maxAmount: Number(input.maxAmount ?? 999999999),
      retailerType: input.retailerType || "percent",
      retailerValue: Number(input.retailerValue ?? 0),
      distributorType: input.distributorType || "percent",
      distributorValue: Number(input.distributorValue ?? 0),
      adminType: input.adminType || "percent",
      adminValue: Number(input.adminValue ?? 0),
      active: input.active ?? true,
    };
  }
}
