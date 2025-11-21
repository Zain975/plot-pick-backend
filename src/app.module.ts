import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { PrismaModule } from "./database/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { UserModule } from "./modules/user/user.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import { OtpModule } from "./modules/otp/otp.module";
import { S3Module } from "./modules/s3/s3.module";
import { CommunityModule } from "./modules/community/community.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TerminusModule,
    PrismaModule,
    HealthModule,
    UserModule,
    AuthModule,
    AdminModule,
    OtpModule,
    S3Module,
    CommunityModule,
  ],
})
export class AppModule {}
