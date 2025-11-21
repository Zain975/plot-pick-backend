import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export enum OtpType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PHONE_VERIFICATION = "PHONE_VERIFICATION",
  LOGIN_EMAIL = "LOGIN_EMAIL",
  LOGIN_PHONE = "LOGIN_PHONE",
}

export enum OtpChannel {
  EMAIL = "EMAIL",
  PHONE = "PHONE",
}

interface GenerateOtpOptions {
  userId?: string;
  adminId?: string;
  type: OtpType;
  channel: OtpChannel;
  expiresInMinutes?: number;
}

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a random 4-6 digit OTP
   */
  private generateOtpCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generate and store OTP in database
   */
  async generateOtp(options: GenerateOtpOptions): Promise<string> {
    const { userId, adminId, type, channel, expiresInMinutes = 10 } = options;

    if (!userId && !adminId) {
      throw new HttpException(
        "Either userId or adminId is required",
        HttpStatus.BAD_REQUEST
      );
    }

    // Generate OTP code
    // For now, use static OTP 123456 (replace with generateOtpCode(6) in production)
    const code = "123456";

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    // Delete any existing unverified OTPs for this user/admin and type
    await this.prisma.otp.deleteMany({
      where: {
        ...(userId ? { userId } : { adminId }),
        type: type as any,
        verifiedAt: null,
      },
    });

    // Create new OTP
    await this.prisma.otp.create({
      data: {
        userId: userId || null,
        adminId: adminId || null,
        code,
        type: type as any,
        channel: channel as any,
        expiresAt,
      },
    });

    // In production, send OTP via email/SMS service here
    // For now, we'll log it (remove in production!)
    console.log(
      `[OTP Generated] Code: ${code}, Type: ${type}, Channel: ${channel}`
    );

    return code;
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    code: string,
    userId?: string,
    adminId?: string,
    type?: OtpType
  ): Promise<boolean> {
    if (!userId && !adminId) {
      throw new HttpException(
        "Either userId or adminId is required",
        HttpStatus.BAD_REQUEST
      );
    }

    const now = new Date();

    // Find the most recent unverified OTP
    const otp = await this.prisma.otp.findFirst({
      where: {
        code,
        ...(userId ? { userId } : { adminId }),
        ...(type ? { type: type as any } : {}),
        verifiedAt: null,
        expiresAt: {
          gt: now, // Not expired
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otp) {
      return false;
    }

    // Mark as verified
    await this.prisma.otp.update({
      where: { id: otp.id },
      data: {
        verifiedAt: now,
      },
    });

    return true;
  }

  /**
   * Clean up expired OTPs (can be called by a cron job)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        verifiedAt: null,
      },
    });

    return result.count;
  }

  /**
   * Get the latest OTP for a user/admin (for debugging/testing)
   */
  async getLatestOtp(userId?: string, adminId?: string, type?: OtpType) {
    return this.prisma.otp.findFirst({
      where: {
        ...(userId ? { userId } : { adminId }),
        ...(type ? { type: type as any } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
