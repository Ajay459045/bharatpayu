import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommissionModule } from "../commission/commission.module";
import { User, UserSchema } from "../users/schemas/user.schema";
import { UsersModule } from "../users/users.module";
import { DistributorController } from "./distributor.controller";
import { DistributorService } from "./distributor.service";

@Module({
  imports: [
    UsersModule,
    CommissionModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [DistributorController],
  providers: [DistributorService],
})
export class DistributorModule {}
