import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express"; 
import { AdminService } from "./admin.service";
import { AdminSignupDto } from "./dto/admin-signup.dto";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { AdminVerifyOtpDto } from "./dto/admin-verify-otp.dto";
import { AdminResendOtpDto } from "./dto/admin-resend-otp.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { AddPlotPointsDto } from "./dto/add-plot-points.dto";
import { UpdateAdminPasswordDto } from "./dto/update-admin-password.dto"; 
import { Public } from "../../common/decorators/public.decorator";
import { AdminGuard } from "../../common/guards/admin.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Post("signup")
  signup(@Body() body: AdminSignupDto) {
    return this.adminService.signup(body);
  }

  @Public()
  @Post("login")
  login(@Body() body: AdminLoginDto) {
    return this.adminService.login(body);
  }

  @Public()
  @Post("verify-otp")
  verifyOtp(@Body() body: AdminVerifyOtpDto) {
    return this.adminService.verifyOtp(body);
  }

  @Public()
  @Post("resend-otp")
  resendOtp(@Body() body: AdminResendOtpDto) {
    return this.adminService.resendOtp(body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard) 
  @Patch("password")
  updateAdminPassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateAdminPasswordDto
  ) {
    const adminId = req.user?.id;
    
    if (!adminId) {
        throw new ForbiddenException("Authentication error: Admin ID not found in token.");
    }
    
    return this.adminService.updatePassword(adminId, body);
  }

  @UseGuards(AdminGuard)
  @Get("users")
  getAllUsers(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getAllUsers(search, pageNum, limitNum);
  }

  @UseGuards(AdminGuard)
  @Get("users/:userId")
  getUserDetails(@Param("userId") userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @UseGuards(AdminGuard)
  @Patch("users/:userId/status")
  updateUserStatus(
    @Param("userId") userId: string,
    @Body() body: UpdateUserStatusDto
  ) {
    return this.adminService.updateUserStatus(userId, body);
  }

  @UseGuards(AdminGuard)
  @Patch("users/:userId/plot-points")
  addPlotPoints(
    @Param("userId") userId: string,
    @Body() body: AddPlotPointsDto
  ) {
    return this.adminService.addPlotPoints(userId, body);
  }
}