import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommissionSlab, CommissionSlabSchema } from "./schemas/commission-slab.schema";
import { CommissionService } from "./commission.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: CommissionSlab.name, schema: CommissionSlabSchema }])],
  providers: [CommissionService],
  exports: [CommissionService, MongooseModule]
})
export class CommissionModule {}
