import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { Comment } from "../entities/comment.entity";

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    postId: string,
    userId: string,
    data: CreateCommentDto
  ): Promise<Comment> {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });

      if (!post) {
        throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
      }

      // If it's a reply, verify parent comment exists
      if (data.parentCommentId) {
        const parentComment = await this.prisma.comment.findUnique({
          where: { id: data.parentCommentId },
        });

        if (!parentComment) {
          throw new HttpException(
            "Parent comment not found",
            HttpStatus.NOT_FOUND
          );
        }

        if (parentComment.postId !== postId) {
          throw new HttpException(
            "Parent comment does not belong to this post",
            HttpStatus.BAD_REQUEST
          );
        }
      }

      const comment = await this.prisma.$transaction(async (tx) => {
        const newComment = await tx.comment.create({
          data: {
            postId,
            userId,
            content: data.content,
            parentCommentId: data.parentCommentId || null,
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
          },
        });

        // Update post comments count
        await tx.post.update({
          where: { id: postId },
          data: { commentsCount: { increment: 1 } },
        });

        // If it's a reply, update parent comment replies count
        if (data.parentCommentId) {
          await tx.comment.update({
            where: { id: data.parentCommentId },
            data: { repliesCount: { increment: 1 } },
          });
        }

        return newComment;
      });

      return {
        ...comment,
        isLiked: false,
        replies: [],
      } as Comment;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to create comment",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findByPostId(
    postId: string,
    userId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<Comment[]> {
    try {
      const skip = (page - 1) * limit;

      const comments = await this.prisma.comment.findMany({
        where: {
          postId,
          parentCommentId: null, // Only top-level comments
        },
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
          replies: {
            take: 5, // Limit replies per comment
            orderBy: { createdAt: "asc" },
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
            },
          },
          likes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
        },
      });

      return comments.map((comment) => ({
        ...comment,
        isLiked: userId ? comment.likes.length > 0 : false,
        replies: comment.replies.map((reply) => ({
          ...reply,
          isLiked: userId ? reply.likes.length > 0 : false,
          likes: undefined,
        })),
        likes: undefined,
      })) as Comment[];
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch comments",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findReplies(
    commentId: string,
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Comment[]> {
    try {
      const skip = (page - 1) * limit;

      const replies = await this.prisma.comment.findMany({
        where: { parentCommentId: commentId },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
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
        },
      });

      return replies.map((reply) => ({
        ...reply,
        isLiked: userId ? reply.likes.length > 0 : false,
        likes: undefined,
      })) as Comment[];
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch replies",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async update(
    id: string,
    userId: string,
    data: UpdateCommentDto
  ): Promise<Comment> {
    try {
      const comment = await this.prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        throw new HttpException("Comment not found", HttpStatus.NOT_FOUND);
      }

      if (comment.userId !== userId) {
        throw new HttpException(
          "You can only update your own comments",
          HttpStatus.FORBIDDEN
        );
      }

      const updatedComment = await this.prisma.comment.update({
        where: { id },
        data: { content: data.content },
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
        },
      });

      return {
        ...updatedComment,
        isLiked: false,
        replies: [],
      } as Comment;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to update comment",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const comment = await this.prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        throw new HttpException("Comment not found", HttpStatus.NOT_FOUND);
      }

      if (comment.userId !== userId) {
        throw new HttpException(
          "You can only delete your own comments",
          HttpStatus.FORBIDDEN
        );
      }

      await this.prisma.$transaction(async (tx) => {
        // Update post comments count
        await tx.post.update({
          where: { id: comment.postId },
          data: { commentsCount: { decrement: 1 } },
        });

        // If it's a reply, update parent comment replies count
        if (comment.parentCommentId) {
          await tx.comment.update({
            where: { id: comment.parentCommentId },
            data: { repliesCount: { decrement: 1 } },
          });
        }

        // Delete the comment (cascade will handle likes and replies)
        await tx.comment.delete({ where: { id } });
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to delete comment",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async toggleLikeComment(
    commentId: string,
    userId: string
  ): Promise<{ message: string; isLiked: boolean }> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new HttpException("Comment not found", HttpStatus.NOT_FOUND);
      }

      const existingLike = await this.prisma.commentLike.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId,
          },
        },
      });

      if (existingLike) {
        // Unlike the comment
        await this.prisma.$transaction([
          this.prisma.commentLike.delete({
            where: { id: existingLike.id },
          }),
          this.prisma.comment.update({
            where: { id: commentId },
            data: { likesCount: { decrement: 1 } },
          }),
        ]);

        return { message: "Comment unliked successfully", isLiked: false };
      } else {
        // Like the comment
        await this.prisma.$transaction([
          this.prisma.commentLike.create({
            data: { commentId, userId },
          }),
          this.prisma.comment.update({
            where: { id: commentId },
            data: { likesCount: { increment: 1 } },
          }),
        ]);

        return { message: "Comment liked successfully", isLiked: true };
      }
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to toggle comment like",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
