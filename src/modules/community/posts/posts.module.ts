import { Module, forwardRef } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { PostsController } from "./posts.controller";
import { PrismaModule } from "../../../database/prisma.module";
import { S3Module } from "../../s3/s3.module";
import { ConfigModule } from "@nestjs/config";
import { FollowModule } from "../follow/follow.module";

@Module({
  imports: [
    PrismaModule,
    S3Module,
    ConfigModule,
    forwardRef(() => FollowModule),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
