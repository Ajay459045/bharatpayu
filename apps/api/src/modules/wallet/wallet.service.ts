import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import { WalletTransaction } from "./schemas/wallet-transaction.schema";
import { Wallet } from "./schemas/wallet.schema";

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(WalletTransaction.name) private readonly walletTxnModel: Model<WalletTransaction>
  ) {}

  async ensureWallet(userId: Types.ObjectId, type: "main" | "commission", session?: ClientSession) {
    const wallet = await this.walletModel.findOneAndUpdate(
      { userId, type },
      { $setOnInsert: { userId, type, balance: 0 } },
      { upsert: true, new: true, session }
    );
    return wallet;
  }

  async debit(userId: Types.ObjectId, type: "main" | "commission", amount: number, referenceId: string, reason: string, session?: ClientSession) {
    const wallet = await this.ensureWallet(userId, type, session);
    if (wallet.balance < amount) throw new BadRequestException("Insufficient wallet balance");
    const openingBalance = wallet.balance;
    wallet.balance -= amount;
    await wallet.save({ session });
    await this.walletTxnModel.create([{ walletId: wallet._id, userId, direction: "debit", amount, openingBalance, closingBalance: wallet.balance, referenceId, reason }], { session });
    return wallet;
  }

  async credit(userId: Types.ObjectId, type: "main" | "commission", amount: number, referenceId: string, reason: string, session?: ClientSession) {
    const wallet = await this.ensureWallet(userId, type, session);
    const openingBalance = wallet.balance;
    wallet.balance += amount;
    await wallet.save({ session });
    await this.walletTxnModel.create([{ walletId: wallet._id, userId, direction: "credit", amount, openingBalance, closingBalance: wallet.balance, referenceId, reason }], { session });
    return wallet;
  }
}
