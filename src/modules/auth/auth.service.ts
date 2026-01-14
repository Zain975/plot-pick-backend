import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { SignupStep1Dto } from "./dto/signup-step1.dto";
import { SignupStep2Dto } from "./dto/signup-step2.dto";
import { SignupStep3Dto } from "./dto/signup-step3.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { LoginDto } from "./dto/login.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { User } from "../user/entities/user.entity";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { OtpService, OtpType, OtpChannel } from "../otp/otp.service";
import { S3Service } from "../s3/s3.service";
import { TwilioService } from "../twilio/twilio.service";

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly s3Service: S3Service,
    private readonly twilioService: TwilioService
  ) {}

  async signupStep1(payload: SignupStep1Dto): Promise<{ user: User }> {
    try {
      const { email, phoneNumber, password, firstName, lastName } = payload;

      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [{ email }, { phoneNumber }],
        },
      });
      if (existing) {
        throw new HttpException(
          "User with this email or phone already exists",
          HttpStatus.CONFLICT
        );
      }

      // Generate OTP code (use 123456 for @mail.com emails, otherwise generate random)
      let otpCode: string;
      if (email.endsWith("@mail.com")) {
        otpCode = "123456";
      } else {
        const min = Math.pow(10, 5);
        const max = Math.pow(10, 6) - 1;
        otpCode = Math.floor(Math.random() * (max - min + 1) + min).toString();
      }

      // Send OTP to email first (before creating user)
      // Skip sending if email ends with @mail.com (testing email)
      if (!email.endsWith("@mail.com")) {
        const otpSent = await this.twilioService.sendEmailOtp(email, otpCode);
        if (!otpSent) {
          throw new HttpException(
            "Failed to send verification email. Please check your email address and try again.",
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Generate unique handle
      const baseHandle = `${firstName}${lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      let uniqueHandle = baseHandle;
      let counter = 1;

      // Check if handle exists, if yes, append number
      while (true) {
        const existing = await this.prisma.user.findUnique({
          where: { uniqueHandle },
        });

        if (!existing) {
          break;
        }

        uniqueHandle = `${baseHandle}${counter}`;
        counter++;
      }

      // Create user only after OTP is sent successfully
      const user = await this.prisma.user.create({
        data: {
          firstName,
          lastName,
          uniqueHandle,
          email,
          phoneNumber,
          passwordHash,
          signupStep: 1,
        },
      });

      // Store the same OTP code in database after user is created
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + 60);

      await this.prisma.otp.create({
        data: {
          userId: user.id,
          code: otpCode,
          type: OtpType.EMAIL_VERIFICATION,
          channel: OtpChannel.EMAIL,
          expiresAt,
        },
      });

      return { user: user as unknown as User };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Signup step 1 error:", error);
      throw new HttpException(
        error?.message || "Failed to create user account",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async verifyEmailOtp(payload: VerifyOtpDto): Promise<{ user: User }> {
    try {
      const { userId, otp } = payload;

      const isValid = await this.otpService.verifyOtp(
        otp,
        userId,
        undefined,
        OtpType.EMAIL_VERIFICATION
      );

      if (!isValid) {
        throw new HttpException(
          "Invalid or expired OTP",
          HttpStatus.BAD_REQUEST
        );
      }

      // Get current user to check status
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerifiedAt: new Date(),
          signupStep: 2,
          // Status remains KYC_PENDING until all steps are complete (only if not LOCKED)
          ...(currentUser.status !== "LOCKED" && {
            status: "KYC_PENDING" as any,
          }),
        },
      });

      return { user: user as unknown as User };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Verify email OTP error:", error);
      throw new HttpException(
        error?.message || "Failed to verify OTP",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async signupStep2(payload: SignupStep2Dto): Promise<{ user: User }> {
    try {
      const {
        userId,
        phoneNumber,
        dateOfBirth,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
      } = payload;

      let otpCode: string | null = null;

      // If phone number is provided, check if it's already taken by another user
      if (phoneNumber) {
        const existingUser = await this.prisma.user.findFirst({
          where: {
            phoneNumber,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          throw new HttpException(
            "Phone number is already in use by another user",
            HttpStatus.CONFLICT
          );
        }

        // Generate OTP code (use 123456 for +92 numbers, otherwise generate random)
        if (phoneNumber.startsWith("+92")) {
          otpCode = "123456";
        } else {
          const min = Math.pow(10, 5);
          const max = Math.pow(10, 6) - 1;
          otpCode = Math.floor(
            Math.random() * (max - min + 1) + min
          ).toString();
        }

        // Send OTP to phone number first (before updating user)
        // Skip sending if phone number starts with +92 (testing number)
        if (!phoneNumber.startsWith("+92")) {
          const otpSent = await this.twilioService.sendSmsOtp(
            phoneNumber,
            otpCode
          );
          if (!otpSent) {
            throw new HttpException(
              "Failed to send verification SMS. Please check your phone number and try again.",
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }
        }
      }

      const updateData: any = {
        dateOfBirth: new Date(dateOfBirth),
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        signupStep: 2,
      };

      // Update phone number if provided
      if (phoneNumber) {
        updateData.phoneNumber = phoneNumber;
      }

      // Update user only after OTP is sent successfully (if phone number provided)
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Store the same OTP code in database after user is updated (if phone number provided)
      if (phoneNumber && otpCode) {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 60);

        await this.prisma.otp.create({
          data: {
            userId: user.id,
            code: otpCode,
            type: OtpType.PHONE_VERIFICATION,
            channel: OtpChannel.PHONE,
            expiresAt,
          },
        });
      }

      return { user: user as unknown as User };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Signup step 2 error:", error);
      throw new HttpException(
        error?.message || "Failed to update user information",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async verifyPhoneOtp(payload: VerifyOtpDto): Promise<{ user: User }> {
    try {
      const { userId, otp } = payload;

      const isValid = await this.otpService.verifyOtp(
        otp,
        userId,
        undefined,
        OtpType.PHONE_VERIFICATION
      );

      if (!isValid) {
        throw new HttpException(
          "Invalid or expired OTP",
          HttpStatus.BAD_REQUEST
        );
      }

      // Get current user to check status
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerifiedAt: new Date(),
          signupStep: 3,
          // Status remains KYC_PENDING until step 3 is complete (only if not LOCKED)
          ...(currentUser.status !== "LOCKED" && {
            status: "KYC_PENDING" as any,
          }),
        },
      });

      return { user: user as unknown as User };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Verify phone OTP error:", error);
      throw new HttpException(
        error?.message || "Failed to verify OTP",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async signupStep3(
    payload: SignupStep3Dto,
    userImage?: any,
    documentFront?: any,
    documentBack?: any
  ): Promise<{ user: User; accessToken: string }> {
    try {
      const { userId, last4Ssn, documentType } = payload;

      // userImage is mandatory in step 3
      if (!userImage) {
        throw new HttpException(
          "User image is required",
          HttpStatus.BAD_REQUEST
        );
      }

      if (!last4Ssn && !documentType) {
        throw new HttpException(
          "Either last4Ssn or documentType with documents are required",
          HttpStatus.BAD_REQUEST
        );
      }

      // If documentType is provided, both front and back documents are required
      if (documentType && (!documentFront || !documentBack)) {
        throw new HttpException(
          "Both front and back document images are required when documentType is provided",
          HttpStatus.BAD_REQUEST
        );
      }

      let userImageUrl: string | null = null;

      // Upload user image to S3
      const userImageFolder = "user/profile";
      const userImageKey = this.s3Service.generateS3Key(
        userImageFolder,
        userId,
        userImage.originalname,
        "user-image"
      );
      userImageUrl = await this.s3Service.uploadFileBuffer(
        userImage,
        userImageKey
      );

      let documentFrontUrl: string | null = null;
      let documentBackUrl: string | null = null;

      // Upload documents to S3 if provided
      if (documentFront && documentBack && documentType) {
        const folder = "user/personal-document";

        const frontKey = this.s3Service.generateS3Key(
          folder,
          userId,
          documentFront.originalname,
          `${documentType.toLowerCase()}-front`
        );

        const backKey = this.s3Service.generateS3Key(
          folder,
          userId,
          documentBack.originalname,
          `${documentType.toLowerCase()}-back`
        );

        documentFrontUrl = await this.s3Service.uploadFileBuffer(
          documentFront,
          frontKey
        );

        documentBackUrl = await this.s3Service.uploadFileBuffer(
          documentBack,
          backKey
        );
      }

      // Get current user to check status
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          userImage: userImageUrl,
          last4Ssn: last4Ssn ?? null,
          documentType: documentType ?? null,
          documentFrontUrl: documentFrontUrl,
          documentBackUrl: documentBackUrl,
          identityVerifiedAt: new Date(),
          signupStep: 3,
          // All steps complete - set status to ACTIVE (only if not LOCKED)
          ...(currentUser.status !== "LOCKED" && {
            status: "ACTIVE" as any,
          }),
        },
      });

      // Generate JWT token for authenticated access
      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: "user",
      };

      const accessToken = this.jwtService.sign(jwtPayload);

      return {
        user: user as unknown as User,
        accessToken,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Signup step 3 error:", error);
      throw new HttpException(
        error?.message || "Failed to complete signup step 3",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async loginRequest(
    payload: LoginDto
  ): Promise<{ userId: string; channel: "email" | "phone" }> {
    const { email, phoneNumber, password } = payload;

    if (!email && !phoneNumber) {
      throw new HttpException(
        "Either email or phoneNumber is required",
        HttpStatus.BAD_REQUEST
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!user) {
      throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    // Check if user account is locked
    if (user.status === "LOCKED") {
      throw new HttpException(
        "Your account is locked by the admin, kindly contact the admin",
        HttpStatus.FORBIDDEN
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    // Generate and store OTP for login
    const otpType = email ? OtpType.LOGIN_EMAIL : OtpType.LOGIN_PHONE;
    const otpChannel = email ? OtpChannel.EMAIL : OtpChannel.PHONE;

    await this.otpService.generateOtp({
      userId: user.id,
      type: otpType,
      channel: otpChannel,
      expiresInSeconds: 60,
    });

    const channel = email ? "email" : "phone";
    return { userId: user.id, channel };
  }

  async verifyLoginOtp(
    payload: VerifyOtpDto
  ): Promise<
    { user: User; accessToken: string } | { user: User; message: string }
  > {
    try {
      const { userId, otp, context } = payload;

      const otpType =
        context === "login-email" ? OtpType.LOGIN_EMAIL : OtpType.LOGIN_PHONE;

      const isValid = await this.otpService.verifyOtp(
        otp,
        userId,
        undefined,
        otpType
      );

      if (!isValid) {
        throw new HttpException(
          "Invalid or expired OTP",
          HttpStatus.BAD_REQUEST
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Check if user account is locked
      if (user.status === "LOCKED") {
        throw new HttpException(
          "Your account is locked by the admin, kindly contact the admin",
          HttpStatus.FORBIDDEN
        );
      }

      // Check if all verifications are complete
      const isEmailVerified = !!user.emailVerifiedAt;
      const isPhoneVerified = !!user.phoneVerifiedAt;
      const isIdentityVerified = !!user.identityVerifiedAt;

      const isFullyVerified =
        isEmailVerified && isPhoneVerified && isIdentityVerified;

      // Update status based on signupStep
      // Note: We already checked for LOCKED status above, so we can safely update here
      let updatedUser = user;
      if (user.signupStep === 3 && user.status === "KYC_PENDING") {
        // All steps complete - set status to ACTIVE
        updatedUser = await this.prisma.user.update({
          where: { id: userId },
          data: {
            status: "ACTIVE" as any,
          },
        });
      } else if (user.signupStep < 3) {
        // Steps not complete - ensure status is KYC_PENDING
        if (user.status !== "KYC_PENDING") {
          updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
              status: "KYC_PENDING" as any,
            },
          });
        }
      }

      if (!isFullyVerified) {
        // Build message indicating what needs to be completed
        const missingSteps: string[] = [];
        if (!isEmailVerified) missingSteps.push("email verification");
        if (!isPhoneVerified) missingSteps.push("phone verification");
        if (!isIdentityVerified) missingSteps.push("identity verification");

        const message = `Onboarding incomplete. Please complete your remaining steps: ${missingSteps.join(
          ", "
        )}.`;

        return {
          user: updatedUser as unknown as User,
          message,
        };
      }

      // All verifications complete - issue access token
      const jwtPayload: JwtPayload = {
        sub: updatedUser.id,
        email: updatedUser.email,
        role: "user",
      };

      const accessToken = this.jwtService.sign(jwtPayload);

      return {
        user: updatedUser as unknown as User,
        accessToken,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Verify login OTP error:", error);
      throw new HttpException(
        error?.message || "Failed to verify OTP",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async resendOtp(payload: ResendOtpDto): Promise<{ message: string }> {
    try {
      const { userId, context } = payload;

      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      let otpType: OtpType;
      let otpChannel: OtpChannel;
      let message: string;

      switch (context) {
        case "email":
          otpType = OtpType.EMAIL_VERIFICATION;
          otpChannel = OtpChannel.EMAIL;
          message = "OTP has been resent to your email";
          break;
        case "phone":
          otpType = OtpType.PHONE_VERIFICATION;
          otpChannel = OtpChannel.PHONE;
          message = "OTP has been resent to your phone";
          break;
        case "login-email":
          otpType = OtpType.LOGIN_EMAIL;
          otpChannel = OtpChannel.EMAIL;
          message = "Login OTP has been resent to your email";
          break;
        case "login-phone":
          otpType = OtpType.LOGIN_PHONE;
          otpChannel = OtpChannel.PHONE;
          message = "Login OTP has been resent to your phone";
          break;
        default:
          throw new HttpException("Invalid context", HttpStatus.BAD_REQUEST);
      }

      // Generate and store new OTP (this will delete old unverified OTPs)
      await this.otpService.generateOtp({
        userId,
        type: otpType,
        channel: otpChannel,
        expiresInSeconds: 60,
      });

      return { message };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Resend OTP error:", error);
      throw new HttpException(
        error?.message || "Failed to resend OTP",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Skip onboarding - allows users who completed step 1 to get a token
   * and access the app in read-only mode
   */
  async skipOnboarding(
    userId: string
  ): Promise<{ user: User; accessToken: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Check if user has completed at least step 1
      if (user.signupStep < 1) {
        throw new HttpException(
          "Please complete step 1 of onboarding first",
          HttpStatus.BAD_REQUEST
        );
      }

      // Check if user account is locked
      if (user.status === "LOCKED") {
        throw new HttpException(
          "Your account is locked by the admin, kindly contact the admin",
          HttpStatus.FORBIDDEN
        );
      }

      // Generate JWT token for authenticated access (even with incomplete onboarding)
      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: "user",
      };

      const accessToken = this.jwtService.sign(jwtPayload);

      return {
        user: user as unknown as User,
        accessToken,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Skip onboarding error:", error);
      throw new HttpException(
        error?.message || "Failed to skip onboarding",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
