import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Ledger, LedgerSchema } from "./schemas/ledger.schema";
import { LedgerService } from "./ledger.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: Ledger.name, schema: LedgerSchema }])],
  providers: [LedgerService],
  exports: [LedgerService, MongooseModule]
})
export class LedgerModule {}
