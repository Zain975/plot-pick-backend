import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserInfoDto } from "./dto/update-user-info.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateAccountPrivacyDto } from "./dto/update-account-privacy.dto";
import { UpdateSocialLinksDto } from "./dto/update-social-links.dto";
import { User } from "./entities/user.entity";
import { UserGuard } from "../../common/guards/user.guard";
import { UseGuards } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() body: CreateUserDto): Promise<User> {
    return this.userService.create(body);
  }

  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @UseGuards(UserGuard)
  @Get("search")
  async searchUsers(
    @Request() req: any,
    @Query("q") searchQuery: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw new HttpException(
        "Search query is required",
        HttpStatus.BAD_REQUEST
      );
    }

    const currentUserId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.userService.searchUsers(
      searchQuery.trim(),
      currentUserId,
      pageNum,
      limitNum
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateUserDto
  ): Promise<User> {
    return this.userService.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string): Promise<void> {
    return this.userService.remove(id);
  }

  @UseGuards(UserGuard)
  @Patch("me/info")
  @UseInterceptors(FileInterceptor("profilePic"))
  async updateUserInfo(
    @Request() req: any,
    @Body() body: UpdateUserInfoDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB max
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false, // Profile pic is optional
      })
    )
    profilePic?: { buffer: Buffer; mimetype: string; originalname: string }
  ): Promise<User> {
    const userId = req.user.id;
    return this.userService.updateUserInfo(userId, body, profilePic);
  }

  @UseGuards(UserGuard)
  @Patch("me/password")
  async updatePassword(
    @Request() req: any,
    @Body() body: UpdatePasswordDto
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.userService.updatePassword(userId, body);
  }

  @UseGuards(UserGuard)
  @Patch("me/account-privacy")
  async updateAccountPrivacy(
    @Request() req: any,
    @Body() body: UpdateAccountPrivacyDto
  ): Promise<User> {
    const userId = req.user.id;
    return this.userService.updateAccountPrivacy(userId, body);
  }

  @UseGuards(UserGuard)
  @Patch("me/social-links")
  async updateSocialLinks(
    @Request() req: any,
    @Body() body: UpdateSocialLinksDto
  ): Promise<User> {
    const userId = req.user.id;
    return this.userService.updateSocialLinks(userId, body);
  }

  @UseGuards(UserGuard)
  @Get(":id/profile")
  async getProfile(@Request() req: any, @Param("id") id: string) {
    const currentUserId = req.user.id;
    return this.userService.getProfile(id, currentUserId);
  }
}
