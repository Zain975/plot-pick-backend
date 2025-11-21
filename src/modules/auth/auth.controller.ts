import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { AuthService } from "./auth.service";
import { SignupStep1Dto } from "./dto/signup-step1.dto";
import { SignupStep2Dto } from "./dto/signup-step2.dto";
import { SignupStep3Dto } from "./dto/signup-step3.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { LoginDto } from "./dto/login.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { ResendEmailOtpDto } from "./dto/resend-email-otp.dto";
import { ResendPhoneOtpDto } from "./dto/resend-phone-otp.dto";
import { Public } from "../../common/decorators/public.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("signup/step1")
  signupStep1(@Body() body: SignupStep1Dto) {
    return this.authService.signupStep1(body);
  }

  @Public()
  @Post("signup/verify-email-otp")
  verifyEmailOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyEmailOtp(body);
  }

  @Public()
  @Post("signup/resend-email-otp")
  resendEmailOtp(@Body() body: ResendEmailOtpDto) {
    return this.authService.resendOtp({
      userId: body.userId,
      context: "email",
    });
  }

  @Public()
  @Post("signup/step2")
  signupStep2(@Body() body: SignupStep2Dto) {
    return this.authService.signupStep2(body);
  }

  @Public()
  @Post("signup/verify-phone-otp")
  verifyPhoneOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyPhoneOtp(body);
  }

  @Public()
  @Post("signup/resend-phone-otp")
  resendPhoneOtp(@Body() body: ResendPhoneOtpDto) {
    return this.authService.resendOtp({
      userId: body.userId,
      context: "phone",
    });
  }

  @Public()
  @Post("signup/step3")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "frontImage", maxCount: 1 },
      { name: "backImage", maxCount: 1 },
    ])
  )
  signupStep3(
    @Body() body: SignupStep3Dto,
    @UploadedFiles()
    files?: {
      frontImage?: Array<{
        buffer: Buffer;
        mimetype: string;
        originalname: string;
      }>;
      backImage?: Array<{
        buffer: Buffer;
        mimetype: string;
        originalname: string;
      }>;
    }
  ) {
    const frontImage = files?.frontImage?.[0];
    const backImage = files?.backImage?.[0];

    return this.authService.signupStep3(body, frontImage, backImage);
  }

  @Public()
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.loginRequest(body);
  }

  @Public()
  @Post("login/verify-otp")
  verifyLoginOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyLoginOtp(body);
  }

  @Public()
  @Post("login/resend-otp")
  resendLoginOtp(@Body() body: ResendOtpDto) {
    return this.authService.resendOtp(body);
  }
}
