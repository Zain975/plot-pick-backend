import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { AdminSignupDto } from "./dto/admin-signup.dto";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { AdminVerifyOtpDto } from "./dto/admin-verify-otp.dto";
import { AdminResendOtpDto } from "./dto/admin-resend-otp.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { AddPlotPointsDto } from "./dto/add-plot-points.dto";
import { Admin } from "./entities/admin.entity";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { OtpService, OtpType, OtpChannel } from "../otp/otp.service";

const SALT_ROUNDS = 10;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService
  ) {}

  async signup(payload: AdminSignupDto): Promise<{ admin: Admin }> {
    try {
      const { email, password } = payload;

      const existing = await this.prisma.admin.findUnique({
        where: { email },
      });

      if (existing) {
        throw new HttpException(
          "Admin with this email already exists",
          HttpStatus.CONFLICT
        );
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const admin = await this.prisma.admin.create({
        data: {
          email,
          passwordHash,
        },
      });

      // Generate and store OTP for email verification (admin signup doesn't require OTP, but keeping for consistency)
      // In production, you might skip OTP for admin signup or require admin approval

      return { admin: admin as unknown as Admin };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Admin signup error:", error);
      throw new HttpException(
        error?.message || "Failed to create admin account",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async login(payload: AdminLoginDto): Promise<{ adminId: string }> {
    try {
      const { email, password } = payload;

      const admin = await this.prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
      }

      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) {
        throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
      }

      // Generate and store OTP for login
      await this.otpService.generateOtp({
        adminId: admin.id,
        type: OtpType.LOGIN_EMAIL,
        channel: OtpChannel.EMAIL,
        expiresInMinutes: 10,
      });

      return { adminId: admin.id };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Admin login error:", error);
      throw new HttpException(
        error?.message || "Failed to login",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async verifyOtp(
    payload: AdminVerifyOtpDto
  ): Promise<{ admin: Admin; accessToken: string }> {
    try {
      const { adminId, otp } = payload;

      const isValid = await this.otpService.verifyOtp(
        otp,
        undefined,
        adminId,
        OtpType.LOGIN_EMAIL
      );

      if (!isValid) {
        throw new HttpException(
          "Invalid or expired OTP",
          HttpStatus.BAD_REQUEST
        );
      }

      const admin = await this.prisma.admin.update({
        where: { id: adminId },
        data: {
          emailVerifiedAt: new Date(),
        },
      });

      const jwtPayload: JwtPayload = {
        sub: admin.id,
        email: admin.email,
        role: "admin",
      };

      const accessToken = this.jwtService.sign(jwtPayload);

      return {
        admin: admin as unknown as Admin,
        accessToken,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Admin verify OTP error:", error);
      throw new HttpException(
        error?.message || "Failed to verify OTP",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async resendOtp(payload: AdminResendOtpDto): Promise<{ message: string }> {
    try {
      const { adminId } = payload;

      // Verify admin exists
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new HttpException("Admin not found", HttpStatus.NOT_FOUND);
      }

      // Generate and store new OTP for login (this will delete old unverified OTPs)
      await this.otpService.generateOtp({
        adminId,
        type: OtpType.LOGIN_EMAIL,
        channel: OtpChannel.EMAIL,
        expiresInMinutes: 10,
      });

      return { message: "Login OTP has been resent to your email" };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Admin resend OTP error:", error);
      throw new HttpException(
        error?.message || "Failed to resend OTP",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateUserStatus(userId: string, payload: UpdateUserStatusDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: payload.status as any,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          uniqueHandle: true,
          email: true,
          status: true,
        },
      });

      return {
        message: `User status updated to ${payload.status}`,
        user: updatedUser,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to update user status",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async addPlotPoints(userId: string, payload: AddPlotPointsDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          plotPoints: {
            increment: payload.points,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          uniqueHandle: true,
          email: true,
          plotPoints: true,
        },
      });

      return {
        message: `Added ${payload.points} plot points to user`,
        user: updatedUser,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to add plot points",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllUsers(
    searchQuery?: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build search condition if search query is provided
      let searchCondition: any = {};
      if (searchQuery && searchQuery.trim().length > 0) {
        const query = searchQuery.trim();
        searchCondition = {
          OR: [
            { firstName: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
            { uniqueHandle: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { phoneNumber: { contains: query, mode: "insensitive" as const } },
          ],
        };
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where: searchCondition,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            uniqueHandle: true,
            email: true,
            phoneNumber: true,
            addressLine1: true,
            addressLine2: true,
            status: true,
          },
        }),
        this.prisma.user.count({
          where: searchCondition,
        }),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch users",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserDetails(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          uniqueHandle: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          last4Ssn: true,
          profilePicUrl: true,
          accountPrivacy: true,
          xUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          documentType: true,
          documentFrontUrl: true,
          documentBackUrl: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          identityVerifiedAt: true,
          signupStep: true,
          status: true,
          plotPoints: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      return user;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to fetch user details",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
