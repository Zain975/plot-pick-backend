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
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ValidationPipe,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { UserGuard } from "../../../common/guards/user.guard";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(UserGuard)
  @Post()
  @UseInterceptors(FilesInterceptor("media", 10)) // Max 10 files
  async create(
    @Request() req: any,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      })
    )
    body: CreatePostDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB max per file
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|mp4|mov|avi|webm)$/,
          }),
        ],
        fileIsRequired: false,
      })
    )
    mediaFiles?: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }>
  ) {
    const userId = req.user.id;
    return this.postsService.create(userId, body, mediaFiles);
  }

  @UseGuards(UserGuard)
  @Get()
  async findAll(
    @Request() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const userId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.postsService.findAll(userId, pageNum, limitNum);
  }

  @UseGuards(UserGuard)
  @Get("user/:userId")
  async findByUserId(
    @Request() req: any,
    @Param("userId") targetUserId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const currentUserId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.postsService.findByUserId(
      targetUserId,
      currentUserId,
      pageNum,
      limitNum
    );
  }

  @UseGuards(UserGuard)
  @Get(":id")
  async findOne(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    return this.postsService.findOne(id, userId);
  }

  @UseGuards(UserGuard)
  @Patch(":id")
  @UseInterceptors(FilesInterceptor("media", 10)) // Max 10 files
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      })
    )
    body: UpdatePostDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB max per file
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|mp4|mov|avi|webm)$/,
          }),
        ],
        fileIsRequired: false,
      })
    )
    mediaFiles?: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }>
  ) {
    const userId = req.user.id;
    return this.postsService.update(id, userId, body, mediaFiles);
  }

  @UseGuards(UserGuard)
  @Delete(":id")
  async remove(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    return this.postsService.remove(id, userId);
  }

  @UseGuards(UserGuard)
  @Post(":id/toggle-like")
  async toggleLikePost(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    return this.postsService.toggleLikePost(id, userId);
  }

  @UseGuards(UserGuard)
  @Post(":id/share")
  async sharePost(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    return this.postsService.sharePost(id, userId);
  }
}
