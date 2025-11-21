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
} from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { UserGuard } from "../../../common/guards/user.guard";

@Controller("posts/:postId/comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(UserGuard)
  @Post()
  async create(
    @Request() req: any,
    @Param("postId") postId: string,
    @Body() body: CreateCommentDto
  ) {
    const userId = req.user.id;
    return this.commentsService.create(postId, userId, body);
  }

  @UseGuards(UserGuard)
  @Get()
  async findByPostId(
    @Request() req: any,
    @Param("postId") postId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const userId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.commentsService.findByPostId(postId, userId, pageNum, limitNum);
  }

  @UseGuards(UserGuard)
  @Get(":commentId/replies")
  async findReplies(
    @Request() req: any,
    @Param("commentId") commentId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const userId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.commentsService.findReplies(
      commentId,
      userId,
      pageNum,
      limitNum
    );
  }

  @UseGuards(UserGuard)
  @Patch(":id")
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: UpdateCommentDto
  ) {
    const userId = req.user.id;
    return this.commentsService.update(id, userId, body);
  }

  @UseGuards(UserGuard)
  @Delete(":id")
  async remove(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    return this.commentsService.remove(id, userId);
  }

  @UseGuards(UserGuard)
  @Post(":id/toggle-like")
  async toggleLikeComment(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    return this.commentsService.toggleLikeComment(id, userId);
  }
}
