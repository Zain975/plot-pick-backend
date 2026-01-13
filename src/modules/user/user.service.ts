import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserInfoDto } from "./dto/update-user-info.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateAccountPrivacyDto } from "./dto/update-account-privacy.dto";
import { UpdateSocialLinksDto } from "./dto/update-social-links.dto";
import { User } from "./entities/user.entity";
import { S3Service } from "../s3/s3.service";
import { Inject, forwardRef } from "@nestjs/common";
import { FollowService } from "../community/follow/follow.service";
import { PlotStatus } from "@prisma/client";

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => FollowService))
    private readonly followService: FollowService
  ) {}

  async create(data: CreateUserDto): Promise<User> {
    try {
      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
        },
      });

      if (existing) {
        throw new HttpException("Email already in use", HttpStatus.CONFLICT);
      }

      // Generate unique handle
      const baseHandle = `${data.firstName}${data.lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      let uniqueHandle = baseHandle;
      let counter = 1;

      // Check if handle exists, if yes, append number
      while (true) {
        const handleExists = await this.prisma.user.findUnique({
          where: { uniqueHandle },
        });

        if (!handleExists) {
          break;
        }

        uniqueHandle = `${baseHandle}${counter}`;
        counter++;
      }

      const user = await this.prisma.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          uniqueHandle,
          email: data.email,
          phoneNumber: data.phoneNumber,
          passwordHash: data.password,
        },
      });

      return user as unknown as User;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to create user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
      return users as unknown as User[];
    } catch (error: any) {
      throw new HttpException(
        error?.message ?? "Failed to fetch users",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      return user as unknown as User;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to fetch user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    try {
      const existing = await this.prisma.user.findUnique({ where: { id } });

      if (!existing) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      if (data.email && data.email !== existing.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          throw new HttpException("Email already in use", HttpStatus.CONFLICT);
        }
      }

      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to update user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const existing = await this.prisma.user.findUnique({ where: { id } });

      if (!existing) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      await this.prisma.user.delete({ where: { id } });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to delete user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate a unique handle based on first name and last name
   */
  private async generateUniqueHandle(
    firstName: string,
    lastName: string
  ): Promise<string> {
    const baseHandle = `${firstName}${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let handle = baseHandle;
    let counter = 1;

    // Check if handle exists, if yes, append number
    while (true) {
      const existing = await this.prisma.user.findUnique({
        where: { uniqueHandle: handle },
      });

      if (!existing) {
        return handle;
      }

      handle = `${baseHandle}${counter}`;
      counter++;
    }
  }

  /**
   * Update user information
   */
  async updateUserInfo(
    userId: string,
    data: UpdateUserInfoDto,
    profilePic?: { buffer: Buffer; mimetype: string; originalname: string }
  ): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Check if uniqueHandle is being updated and if it's already taken
      if (data.uniqueHandle && data.uniqueHandle !== user.uniqueHandle) {
        const handleExists = await this.prisma.user.findUnique({
          where: { uniqueHandle: data.uniqueHandle },
        });

        if (handleExists) {
          throw new HttpException(
            "This unique handle is already taken. Please choose another one.",
            HttpStatus.CONFLICT
          );
        }
      }

      const updateData: any = {};

      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.uniqueHandle !== undefined)
        updateData.uniqueHandle = data.uniqueHandle;
      if (data.dateOfBirth !== undefined) {
        updateData.dateOfBirth = data.dateOfBirth
          ? new Date(data.dateOfBirth)
          : null;
      }
      if (data.last4Ssn !== undefined)
        updateData.last4Ssn = data.last4Ssn || null;
      if (data.addressLine1 !== undefined)
        updateData.addressLine1 = data.addressLine1 || null;
      if (data.addressLine2 !== undefined)
        updateData.addressLine2 = data.addressLine2 || null;
      if (data.city !== undefined) updateData.city = data.city || null;
      if (data.state !== undefined) updateData.state = data.state || null;
      if (data.zipCode !== undefined) updateData.zipCode = data.zipCode || null;

      // Handle profile picture upload
      if (profilePic) {
        // Delete old profile picture from S3 if exists
        if (user.profilePicUrl) {
          try {
            const oldKey = this.s3Service.extractKeyFromUrl(user.profilePicUrl);
            await this.s3Service.deleteFile(oldKey);
          } catch (error) {
            // Log error but don't fail the update if deletion fails
            console.error("Failed to delete old profile picture:", error);
          }
        }

        // Upload new profile picture to S3
        const folder = "user/profile-picture";
        const key = this.s3Service.generateS3Key(
          folder,
          userId,
          profilePic.originalname,
          "profile"
        );

        const profilePicUrl = await this.s3Service.uploadFileBuffer(
          profilePic,
          key
        );
        updateData.profilePicUrl = profilePicUrl;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return updatedUser as unknown as User;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to update user information",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    data: UpdatePasswordDto
  ): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(
        data.oldPassword,
        user.passwordHash
      );

      if (!isOldPasswordValid) {
        throw new HttpException(
          "Old password is incorrect",
          HttpStatus.BAD_REQUEST
        );
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      return { message: "Password updated successfully" };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to update password",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update account privacy
   */
  async updateAccountPrivacy(
    userId: string,
    data: UpdateAccountPrivacyDto
  ): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          accountPrivacy: data.accountPrivacy as any,
        },
      });

      return updatedUser as unknown as User;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to update account privacy",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update social links (only if account is public)
   */
  async updateSocialLinks(
    userId: string,
    data: UpdateSocialLinksDto
  ): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Check if account privacy is public
      if (user.accountPrivacy !== "PUBLIC") {
        throw new HttpException(
          "You can only update social links when your account privacy is set to PUBLIC",
          HttpStatus.FORBIDDEN
        );
      }

      const updateData: any = {};

      if (data.xUrl !== undefined) updateData.xUrl = data.xUrl || null;
      if (data.instagramUrl !== undefined)
        updateData.instagramUrl = data.instagramUrl || null;
      if (data.tiktokUrl !== undefined)
        updateData.tiktokUrl = data.tiktokUrl || null;

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return updatedUser as unknown as User;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error?.message ?? "Failed to update social links",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user profile with stats
   */
  async getProfile(userId: string, currentUserId?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          uniqueHandle: true,
          email: true,
          profilePicUrl: true,
          accountPrivacy: true,
          xUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Get counts
      const [postsCount, followersCount, followingCount] = await Promise.all([
        this.prisma.post.count({ where: { userId } }),
        this.prisma.follow.count({ where: { followingId: userId } }),
        this.prisma.follow.count({ where: { followerId: userId } }),
      ]);

      // Check if current user is following this user
      let isFollowing = false;
      if (currentUserId && currentUserId !== userId) {
        isFollowing = await this.followService.isFollowing(
          currentUserId,
          userId
        );
      }

      return {
        ...user,
        postsCount,
        followersCount,
        followingCount,
        isFollowing,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to fetch user profile",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Search users by firstName, lastName, or uniqueHandle
   * Supports partial word matching (e.g., "joh" matches "john", "johndoe", etc.)
   */
  async searchUsers(
    searchQuery: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build search condition - search in firstName, lastName, or uniqueHandle
      // Uses contains for partial word matching (matches anywhere in the string)
      // This allows searching for "joh" to match "john", "johndoe", etc.
      const searchCondition = {
        OR: [
          {
            firstName: { contains: searchQuery, mode: "insensitive" as const },
          },
          { lastName: { contains: searchQuery, mode: "insensitive" as const } },
          {
            uniqueHandle: {
              contains: searchQuery,
              mode: "insensitive" as const,
            },
          },
        ],
      };

      // The 'contains' operator with 'insensitive' mode supports partial word matching
      // Examples:
      // - Searching "joh" will match "john", "johndoe", "ajohn", etc.
      // - Searching "doe" will match "doe", "johndoe", "doe123", etc.
      // - Searching "johnd" will match "johndoe", "johndoe123", etc.
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where: searchCondition,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            uniqueHandle: true,
            profilePicUrl: true,
            accountPrivacy: true,
          },
        }),
        this.prisma.user.count({
          where: searchCondition,
        }),
      ]);

      // Check if current user follows each user in search results
      const usersWithStatus = await Promise.all(
        users.map(async (user) => {
          let isFollowing = false;
          if (currentUserId !== user.id) {
            isFollowing = await this.followService.isFollowing(
              currentUserId,
              user.id
            );
          }
          return {
            ...user,
            isFollowing,
          };
        })
      );

      return {
        users: usersWithStatus,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to search users",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculate prediction status and accuracy
   */
  private calculatePredictionStats(
    plotStatus: PlotStatus,
    questionPredictions: any[],
    questions: any[]
  ): { status: "won" | "lost" | "pending"; accuracy: number } {
    // If results not announced, status is pending
    if (plotStatus !== PlotStatus.RESULTS_ANNOUNCED) {
      return { status: "pending", accuracy: 0 };
    }

    // Calculate accuracy
    let correctCount = 0;
    const totalQuestions = questions.length;

    for (const question of questions) {
      if (!question.correctOptionId) continue;

      const userPrediction = questionPredictions.find(
        (qp) => qp.questionId === question.id
      );

      if (
        userPrediction &&
        userPrediction.optionId === question.correctOptionId
      ) {
        correctCount++;
      }
    }

    const accuracy =
      totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const status = accuracy >= 60 ? "won" : "lost";

    return { status, accuracy };
  }

  /**
   * Get user's own prediction details with statistics
   */
  async getMyPredictionDetails(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          uniqueHandle: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          last4Ssn: true,
          profilePicUrl: true,
          accountPrivacy: true,
          xUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          documentType: true,
          documentFrontUrl: true,
          documentBackUrl: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          identityVerifiedAt: true,
          signupStep: true,
          status: true,
          plotPoints: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Get all predictions with full details
      const predictions = await this.prisma.plotPrediction.findMany({
        where: { userId },
        include: {
          plot: {
            include: {
              show: true,
              questions: {
                include: {
                  options: true,
                  correctOption: true,
                },
                orderBy: { order: "asc" },
              },
            },
          },
          questionPredictions: {
            include: {
              question: {
                include: {
                  options: true,
                  correctOption: true,
                },
              },
              option: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate statistics
      const totalPredictions = predictions.length;
      let pendingPredictions = 0;
      let wonCount = 0;
      let lostCount = 0;
      let totalAccuracy = 0;
      let completedPredictions = 0;

      // Process predictions array with status and details
      const predictionsArray = predictions.map((prediction) => {
        const { status, accuracy } = this.calculatePredictionStats(
          prediction.plot.status,
          prediction.questionPredictions,
          prediction.plot.questions
        );

        if (status === "pending") {
          pendingPredictions++;
        } else {
          completedPredictions++;
          totalAccuracy += accuracy;
          if (status === "won") {
            wonCount++;
          } else if (status === "lost") {
            lostCount++;
          }
        }

        // Build questions array with user predictions and correct answers
        const questionsWithPredictions = prediction.plot.questions.map(
          (question) => {
            const userQuestionPrediction = prediction.questionPredictions.find(
              (qp) => qp.questionId === question.id
            );

            return {
              id: question.id,
              questionText: question.questionText,
              type: question.type,
              order: question.order,
              options: question.options.map((opt) => ({
                id: opt.id,
                optionText: opt.optionText,
                order: opt.order,
              })),
              userPredictedOptionId: userQuestionPrediction?.optionId || null,
              correctOptionId: question.correctOptionId || null,
            };
          }
        );

        return {
          id: prediction.id,
          show: {
            id: prediction.plot.show.id,
            title: prediction.plot.show.title,
            seasonNumber: prediction.plot.show.seasonNumber,
            description: prediction.plot.show.description,
            thumbnailUrl: prediction.plot.show.thumbnailUrl,
            minimumAmount: prediction.plot.show.minimumAmount,
            maximumAmount: prediction.plot.show.maximumAmount,
            payoutAmount: prediction.plot.show.payoutAmount,
            plotpicksVig: prediction.plot.show.plotpicksVig,
            bonusKicker: prediction.plot.show.bonusKicker,
            bonusAmount: prediction.plot.show.bonusAmount,
          },
          plot: {
            id: prediction.plot.id,
            episodeNumber: prediction.plot.episodeNumber,
            type: prediction.plot.type,
            numberOfQuestions: prediction.plot.numberOfQuestions,
            activeStartDate: prediction.plot.activeStartDate,
            activeStartTime: prediction.plot.activeStartTime,
            closeEndDate: prediction.plot.closeEndDate,
            closeEndTime: prediction.plot.closeEndTime,
            status: prediction.plot.status,
            questions: questionsWithPredictions,
          },
          totalQuestions: prediction.plot.numberOfQuestions,
          predictionDate: prediction.createdAt,
          status,
          accuracy:
            status === "pending" ? null : parseFloat(accuracy.toFixed(2)),
          predictedAmount: prediction.predictedAmount,
        };
      });

      // Calculate win rate and average accuracy
      const winRate =
        completedPredictions > 0
          ? parseFloat(((wonCount / completedPredictions) * 100).toFixed(2))
          : 0;
      const averageAccuracy =
        completedPredictions > 0
          ? parseFloat((totalAccuracy / completedPredictions).toFixed(2))
          : 0;

      return {
        ...user,
        totalPredictions,
        winRate,
        accuracy: averageAccuracy,
        pendingPredictions,
        wonPredictions: wonCount,
        lostPredictions: lostCount,
        predictions: predictionsArray,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to fetch prediction details",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
