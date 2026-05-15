import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import { TdsReport } from "./schemas/tds-report.schema";

@Injectable()
export class TdsService {
  constructor(@InjectModel(TdsReport.name) private readonly tdsModel: Model<TdsReport>) {}

  breakup(grossCommission: number) {
    const tdsAmount = Number((grossCommission * 0.05).toFixed(2));
    return { grossCommission, tdsAmount, netCommission: Number((grossCommission - tdsAmount).toFixed(2)) };
  }

  create(userId: Types.ObjectId, grossCommission: number, transactionId: string, session?: ClientSession) {
    return this.tdsModel.create([{ userId, transactionId, ...this.breakup(grossCommission) }], { session });
  }
}
