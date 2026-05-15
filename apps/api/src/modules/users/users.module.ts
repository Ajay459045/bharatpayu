import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentRecord, DocumentRecordSchema } from "./schemas/document.schema";
import { LocationRecord, LocationRecordSchema } from "./schemas/location.schema";
import { User, UserSchema } from "./schemas/user.schema";
import { UsersService } from "./users.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DocumentRecord.name, schema: DocumentRecordSchema },
      { name: LocationRecord.name, schema: LocationRecordSchema }
    ])
  ],
  providers: [UsersService],
  exports: [UsersService, MongooseModule]
})
export class UsersModule {}
