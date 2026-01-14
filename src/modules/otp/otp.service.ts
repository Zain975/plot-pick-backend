import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { TwilioService } from "../twilio/twilio.service";

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
  expiresInSeconds?: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioService: TwilioService
  ) {}

  /**
   * Generate a random 6-digit OTP
   */
  private generateOtpCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generate and store OTP in database, and send via SMS/Email
   */
  async generateOtp(options: GenerateOtpOptions): Promise<string> {
    const { userId, adminId, type, channel, expiresInSeconds = 60 } = options;

    if (!userId && !adminId) {
      throw new HttpException(
        "Either userId or adminId is required",
        HttpStatus.BAD_REQUEST
      );
    }

    // Generate 6-digit OTP code (will be overridden for test cases)
    let code = this.generateOtpCode(6);

    // Calculate expiration time (60 seconds by default)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

    // Delete any existing unverified OTPs for this user/admin and type
    await this.prisma.otp.deleteMany({
      where: {
        ...(userId ? { userId } : { adminId }),
        type: type as any,
        verifiedAt: null,
      },
    });

    // Send OTP via SMS or Email using Twilio (and determine code for test cases)
    if (channel === OtpChannel.EMAIL) {
      // Get email from user or admin
      let email: string | null = null;
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        email = user?.email || null;
      } else if (adminId) {
        const admin = await this.prisma.admin.findUnique({
          where: { id: adminId },
          select: { email: true },
        });
        email = admin?.email || null;
      }

      if (email) {
        // Use 123456 for admin emails or @mail.com test emails, skip sending
        if (adminId || email.endsWith("@mail.com")) {
          code = "123456";
        } else {
          const sent = await this.twilioService.sendEmailOtp(email, code);
          if (!sent) {
            this.logger.warn(
              `Failed to send email OTP to ${email}, but OTP is stored in database`
            );
          }
        }
      } else {
        this.logger.warn(
          `Email not found for ${userId ? "user" : "admin"} ID: ${
            userId || adminId
          }`
        );
      }
    } else if (channel === OtpChannel.PHONE) {
      // Get phone number from user
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { phoneNumber: true },
        });
        const phoneNumber = user?.phoneNumber || null;

        if (phoneNumber) {
          // Use 123456 for +92 test numbers, skip sending
          if (phoneNumber.startsWith("+92")) {
            code = "123456";
          } else {
            const sent = await this.twilioService.sendSmsOtp(phoneNumber, code);
            if (!sent) {
              this.logger.warn(
                `Failed to send SMS OTP to ${phoneNumber}, but OTP is stored in database`
              );
            }
          }
        } else {
          this.logger.warn(`Phone number not found for user ID: ${userId}`);
        }
      } else {
        this.logger.warn("Phone OTP is not supported for admin");
      }
    }

    // Create OTP in database with the final code (test code or generated code)
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
