import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import { Ledger } from "./schemas/ledger.schema";

@Injectable()
export class LedgerService {
  constructor(@InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>) {}

  create(entry: Partial<Ledger> & { userId: Types.ObjectId; transactionId: string }, session?: ClientSession) {
    return this.ledgerModel.create([entry], { session });
  }
}
