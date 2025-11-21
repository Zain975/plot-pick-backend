import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleFollow(
    followerId: string,
    followingId: string
  ): Promise<{ message: string; isFollowing: boolean }> {
    try {
      if (followerId === followingId) {
        throw new HttpException(
          "You cannot follow yourself",
          HttpStatus.BAD_REQUEST
        );
      }

      const followingUser = await this.prisma.user.findUnique({
        where: { id: followingId },
      });

      if (!followingUser) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const existingFollow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (existingFollow) {
        // Unfollow the user
        await this.prisma.follow.delete({
          where: { id: existingFollow.id },
        });

        return { message: "User unfollowed successfully", isFollowing: false };
      } else {
        // Follow the user
        await this.prisma.follow.create({
          data: {
            followerId,
            followingId,
          },
        });

        return { message: "User followed successfully", isFollowing: true };
      }
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to toggle follow",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getFollowers(
    userId: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      const [followers, total] = await Promise.all([
        this.prisma.follow.findMany({
          where: { followingId: userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            follower: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                uniqueHandle: true,
                profilePicUrl: true,
              },
            },
          },
        }),
        this.prisma.follow.count({
          where: { followingId: userId },
        }),
      ]);

      // Check if current user follows each follower
      const followersWithStatus = await Promise.all(
        followers.map(async (f) => {
          let isFollowing = false;
          if (currentUserId && currentUserId !== f.follower.id) {
            isFollowing = await this.isFollowing(currentUserId, f.follower.id);
          }
          return {
            ...f.follower,
            isFollowing,
          };
        })
      );

      return {
        followers: followersWithStatus,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch followers",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getFollowing(
    userId: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      const [following, total] = await Promise.all([
        this.prisma.follow.findMany({
          where: { followerId: userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            following: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                uniqueHandle: true,
                profilePicUrl: true,
              },
            },
          },
        }),
        this.prisma.follow.count({
          where: { followerId: userId },
        }),
      ]);

      // Check if current user follows each user in the following list
      const followingWithStatus = await Promise.all(
        following.map(async (f) => {
          let isFollowing = false;
          if (currentUserId && currentUserId !== f.following.id) {
            isFollowing = await this.isFollowing(currentUserId, f.following.id);
          }
          return {
            ...f.following,
            isFollowing,
          };
        })
      );

      return {
        following: followingWithStatus,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch following",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      return !!follow;
    } catch (error: any) {
      return false;
    }
  }
}
