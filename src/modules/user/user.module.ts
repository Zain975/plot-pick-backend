import { Module, forwardRef } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { PrismaModule } from "../../database/prisma.module";
import { S3Module } from "../s3/s3.module";
import { FollowModule } from "../community/follow/follow.module";

@Module({
  imports: [PrismaModule, S3Module, forwardRef(() => FollowModule)],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
