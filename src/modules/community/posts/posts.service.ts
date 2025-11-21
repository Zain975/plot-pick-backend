import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { S3Service } from "../../s3/s3.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { Post } from "../entities/post.entity";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService
  ) {}

  async create(
    userId: string,
    data: CreatePostDto,
    mediaFiles?: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }>
  ): Promise<Post> {
    try {
      let mediaUrls: string[] = [];

      // Upload media files to S3 if provided
      if (mediaFiles && mediaFiles.length > 0) {
        const folder = `user/posts/${userId}`;
        const uploadPromises = mediaFiles.map((file, index) => {
          const key = this.s3Service.generateS3Key(
            folder,
            userId,
            file.originalname,
            `post-${Date.now()}-${index}`
          );
          return this.s3Service.uploadFileBuffer(file, key);
        });
        mediaUrls = await Promise.all(uploadPromises);
      }

      const post = await this.prisma.post.create({
        data: {
          userId,
          description: data.description || null,
          mediaUrls,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              uniqueHandle: true,
              profilePicUrl: true,
            },
          },
          likes: {
            where: { userId },
            select: { id: true },
          },
          shares: {
            where: { userId },
            select: { id: true },
          },
        },
      });

      return {
        ...post,
        isLiked: post.likes.length > 0,
        isShared: post.shares.length > 0,
        likes: undefined,
        shares: undefined,
      } as Post;
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to create post",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAll(
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Post[]> {
    try {
      const skip = (page - 1) * limit;

      const posts = await this.prisma.post.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              uniqueHandle: true,
              profilePicUrl: true,
            },
          },
          likes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
          shares: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
        },
      });

      return posts.map((post) => ({
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        isShared: userId ? post.shares.length > 0 : false,
        likes: undefined,
        shares: undefined,
      })) as Post[];
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch posts",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findByUserId(
    targetUserId: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Post[]> {
    try {
      const skip = (page - 1) * limit;

      const posts = await this.prisma.post.findMany({
        where: { userId: targetUserId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              uniqueHandle: true,
              profilePicUrl: true,
            },
          },
          likes: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { id: true },
              }
            : false,
          shares: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { id: true },
              }
            : false,
        },
      });

      return posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes.length > 0 : false,
        isShared: currentUserId ? post.shares.length > 0 : false,
        likes: undefined,
        shares: undefined,
      })) as Post[];
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch user posts",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findOne(id: string, userId?: string): Promise<Post> {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              uniqueHandle: true,
              profilePicUrl: true,
            },
          },
          likes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
          shares: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
        },
      });

      if (!post) {
        throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
      }

      return {
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        isShared: userId ? post.shares.length > 0 : false,
        likes: undefined,
        shares: undefined,
      } as Post;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to fetch post",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async update(
    id: string,
    userId: string,
    data: UpdatePostDto,
    mediaFiles?: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }>
  ): Promise<Post> {
    try {
      const post = await this.prisma.post.findUnique({ where: { id } });

      if (!post) {
        throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
      }

      if (post.userId !== userId) {
        throw new HttpException(
          "You can only update your own posts",
          HttpStatus.FORBIDDEN
        );
      }

      const updateData: any = {};

      // Update description if provided
      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      // Handle media upload - delete old media and upload new
      if (mediaFiles && mediaFiles.length > 0) {
        // Delete old media files from S3
        if (post.mediaUrls.length > 0) {
          const deletePromises = post.mediaUrls.map((url) => {
            try {
              const key = this.s3Service.extractKeyFromUrl(url);
              return this.s3Service.deleteFile(key);
            } catch (error) {
              console.error("Failed to delete old media file:", error);
              return Promise.resolve();
            }
          });
          await Promise.all(deletePromises);
        }

        // Upload new media files to S3
        const folder = `user/posts/${userId}`;
        const uploadPromises = mediaFiles.map((file, index) => {
          const key = this.s3Service.generateS3Key(
            folder,
            userId,
            file.originalname,
            `post-${Date.now()}-${index}`
          );
          return this.s3Service.uploadFileBuffer(file, key);
        });
        const newMediaUrls = await Promise.all(uploadPromises);
        updateData.mediaUrls = newMediaUrls;
      }

      const updatedPost = await this.prisma.post.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              uniqueHandle: true,
              profilePicUrl: true,
            },
          },
          likes: {
            where: { userId },
            select: { id: true },
          },
          shares: {
            where: { userId },
            select: { id: true },
          },
        },
      });

      return {
        ...updatedPost,
        isLiked: updatedPost.likes.length > 0,
        isShared: updatedPost.shares.length > 0,
        likes: undefined,
        shares: undefined,
      } as Post;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to update post",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const post = await this.prisma.post.findUnique({ where: { id } });

      if (!post) {
        throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
      }

      if (post.userId !== userId) {
        throw new HttpException(
          "You can only delete your own posts",
          HttpStatus.FORBIDDEN
        );
      }

      // Delete media files from S3
      if (post.mediaUrls.length > 0) {
        const deletePromises = post.mediaUrls.map((url) => {
          try {
            const key = this.s3Service.extractKeyFromUrl(url);
            return this.s3Service.deleteFile(key);
          } catch (error) {
            console.error("Failed to delete media file:", error);
            return Promise.resolve();
          }
        });
        await Promise.all(deletePromises);
      }

      await this.prisma.post.delete({ where: { id } });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to delete post",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async toggleLikePost(
    postId: string,
    userId: string
  ): Promise<{ message: string; isLiked: boolean }> {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });

      if (!post) {
        throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
      }

      const existingLike = await this.prisma.postLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      if (existingLike) {
        // Unlike the post
        await this.prisma.$transaction([
          this.prisma.postLike.delete({
            where: { id: existingLike.id },
          }),
          this.prisma.post.update({
            where: { id: postId },
            data: { likesCount: { decrement: 1 } },
          }),
        ]);

        return { message: "Post unliked successfully", isLiked: false };
      } else {
        // Like the post
        await this.prisma.$transaction([
          this.prisma.postLike.create({
            data: { postId, userId },
          }),
          this.prisma.post.update({
            where: { id: postId },
            data: { likesCount: { increment: 1 } },
          }),
        ]);

        return { message: "Post liked successfully", isLiked: true };
      }
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to toggle post like",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async sharePost(
    postId: string,
    userId: string
  ): Promise<{ message: string; shareUrl: string }> {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });

      if (!post) {
        throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
      }

      const existingShare = await this.prisma.postShare.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      if (existingShare) {
        throw new HttpException("Post already shared", HttpStatus.BAD_REQUEST);
      }

      await this.prisma.$transaction([
        this.prisma.postShare.create({
          data: { postId, userId },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { sharesCount: { increment: 1 } },
        }),
      ]);

      const baseUrl =
        this.configService.get<string>("APP_URL") || "http://localhost:4000";
      const shareUrl = `${baseUrl}/posts/${postId}`;

      return { message: "Post shared successfully", shareUrl };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to share post",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
