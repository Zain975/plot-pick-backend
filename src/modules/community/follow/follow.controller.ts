import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { FollowService } from "./follow.service";
import { UserGuard } from "../../../common/guards/user.guard";

@Controller("users")
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @UseGuards(UserGuard)
  @Post(":userId/toggle-follow")
  async toggleFollow(
    @Request() req: any,
    @Param("userId") followingId: string
  ) {
    const followerId = req.user.id;
    return this.followService.toggleFollow(followerId, followingId);
  }

  @UseGuards(UserGuard)
  @Get(":userId/followers")
  async getFollowers(
    @Request() req: any,
    @Param("userId") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const currentUserId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.followService.getFollowers(
      userId,
      currentUserId,
      pageNum,
      limitNum
    );
  }

  @UseGuards(UserGuard)
  @Get(":userId/following")
  async getFollowing(
    @Request() req: any,
    @Param("userId") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const currentUserId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.followService.getFollowing(
      userId,
      currentUserId,
      pageNum,
      limitNum
    );
  }
}
