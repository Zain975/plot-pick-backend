import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { S3Service } from "../s3/s3.service";
import { CreateShowWithEpisodeDto } from "./dto/admin/create-show-with-episode.dto";
import { UpdateShowWithEpisodeDto } from "./dto/admin/update-show-with-episode.dto";
import { AnnounceResultsDto } from "./dto/admin/announce-results.dto";
import { CreatePredictionDto } from "./dto/user/create-prediction.dto";
import { PlotStatus, PlotType, QuestionType } from "@prisma/client";

@Injectable()
export class PlotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service
  ) {}

  // ==================== ADMIN: Show + Episode Management ====================

  async createShowWithEpisode(data: CreateShowWithEpisodeDto): Promise<any> {
    try {
      // Validate number of questions matches
      if (data.questions.length !== data.numberOfQuestions) {
        throw new HttpException(
          "Number of questions does not match numberOfQuestions field",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate question options based on type
      for (const question of data.questions) {
        if (question.type === QuestionType.YES_NO) {
          if (question.options.length !== 2) {
            throw new HttpException(
              "YES_NO questions must have exactly 2 options",
              HttpStatus.BAD_REQUEST
            );
          }
        } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
          if (question.options.length !== 4) {
            throw new HttpException(
              "MULTIPLE_CHOICE questions must have exactly 4 options",
              HttpStatus.BAD_REQUEST
            );
          }
        }
      }

      // Check if show with same title and season already exists
      const existingShow = await this.prisma.show.findUnique({
        where: {
          title_seasonNumber: {
            title: data.title,
            seasonNumber: data.seasonNumber,
          },
        },
      });

      // Create show and episode in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        let show;

        if (existingShow) {
          // Show exists, use it and update if needed
          show = await tx.show.update({
            where: { id: existingShow.id },
            data: {
              ...(data.thumbnailUrl !== undefined &&
                data.thumbnailUrl !== null &&
                data.thumbnailUrl !== "" && {
                  thumbnailUrl: data.thumbnailUrl,
                }),
              ...(data.description !== undefined && {
                description: data.description,
              }),
              ...(data.minimumAmount !== undefined && {
                minimumAmount: data.minimumAmount,
              }),
              ...(data.maximumAmount !== undefined && {
                maximumAmount: data.maximumAmount,
              }),
              ...(data.payoutAmount !== undefined && {
                payoutAmount: data.payoutAmount,
              }),
              ...(data.plotpicksVig !== undefined && {
                plotpicksVig: data.plotpicksVig,
              }),
              ...(data.bonusKicker !== undefined && {
                bonusKicker: data.bonusKicker,
              }),
              ...(data.bonusAmount !== undefined && {
                bonusAmount: data.bonusAmount,
              }),
            },
          });

          // Check if episode already exists
          const existingPlot = await tx.plot.findUnique({
            where: {
              showId_episodeNumber: {
                showId: show.id,
                episodeNumber: data.episode,
              },
            },
          });

          if (existingPlot) {
            throw new HttpException(
              `Episode ${data.episode} already exists for this show. Use update API to modify it.`,
              HttpStatus.BAD_REQUEST
            );
          }
        } else {
          // Create new show
          show = await tx.show.create({
            data: {
              ...(data.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
              title: data.title,
              seasonNumber: data.seasonNumber,
              description: data.description,
              minimumAmount: data.minimumAmount,
              maximumAmount: data.maximumAmount,
              payoutAmount: data.payoutAmount,
              plotpicksVig: data.plotpicksVig,
              bonusKicker: data.bonusKicker,
              bonusAmount: data.bonusAmount,
            },
          });
        }

        // Create episode (plot) for this show
        const plot = await tx.plot.create({
          data: {
            showId: show.id,
            episodeNumber: data.episode,
            type: data.type,
            numberOfQuestions: data.numberOfQuestions,
            activeStartDate: new Date(data.activeStartDate),
            activeStartTime: data.activeStartTime,
            closeEndDate: new Date(data.closeEndDate),
            closeEndTime: data.closeEndTime,
            status: PlotStatus.DRAFT,
          },
        });

        // Create questions with options
        for (const questionData of data.questions) {
          await tx.question.create({
            data: {
              plotId: plot.id,
              questionText: questionData.questionText,
              type: questionData.type,
              order: questionData.order,
              options: {
                create: questionData.options.map((opt) => ({
                  optionText: opt.optionText,
                  order: opt.order,
                })),
              },
            },
          });
        }

        return { show, plotId: plot.id };
      });

      // Fetch complete show with all episodes (plots)
      const completeShow = await this.prisma.show.findUnique({
        where: { id: result.show.id },
        include: {
          plots: {
            include: {
              questions: {
                include: {
                  options: true,
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { episodeNumber: "asc" }, // Order episodes by episode number
          },
        },
      });

      return completeShow;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Create show with episode error:", error);
      throw new HttpException(
        error?.message || "Failed to create show with episode",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateShowWithEpisode(
    showId: string,
    episodeNumber: number,
    data: UpdateShowWithEpisodeDto
  ): Promise<any> {
    try {
      const show = await this.prisma.show.findUnique({
        where: { id: showId },
      });

      if (!show) {
        throw new HttpException("Show not found", HttpStatus.NOT_FOUND);
      }

      // Check if plot exists for this episode
      const existingPlot = await this.prisma.plot.findUnique({
        where: {
          showId_episodeNumber: {
            showId,
            episodeNumber,
          },
        },
        include: {
          questions: {
            include: {
              questionPredictions: true,
            },
          },
          plotPredictions: true,
        },
      });

      // Update show fields if provided
      const showUpdateData: any = {};
      // Only update thumbnailUrl if it's provided and not empty
      if (
        data.thumbnailUrl !== undefined &&
        data.thumbnailUrl !== null &&
        data.thumbnailUrl !== ""
      ) {
        showUpdateData.thumbnailUrl = data.thumbnailUrl;
      }
      if (data.title !== undefined) showUpdateData.title = data.title;
      if (data.seasonNumber !== undefined)
        showUpdateData.seasonNumber = data.seasonNumber;
      if (data.description !== undefined)
        showUpdateData.description = data.description;
      if (data.minimumAmount !== undefined)
        showUpdateData.minimumAmount = data.minimumAmount;
      if (data.maximumAmount !== undefined)
        showUpdateData.maximumAmount = data.maximumAmount;
      if (data.payoutAmount !== undefined)
        showUpdateData.payoutAmount = data.payoutAmount;
      if (data.plotpicksVig !== undefined)
        showUpdateData.plotpicksVig = data.plotpicksVig;
      if (data.bonusKicker !== undefined)
        showUpdateData.bonusKicker = data.bonusKicker;
      if (data.bonusAmount !== undefined)
        showUpdateData.bonusAmount = data.bonusAmount;

      // Update or create plot for this episode
      let plot;
      if (existingPlot) {
        // Update existing plot
        if (existingPlot.status === PlotStatus.RESULTS_ANNOUNCED) {
          throw new HttpException(
            "Cannot update plot after results are announced",
            HttpStatus.BAD_REQUEST
          );
        }

        // If questions are provided, validate and update them
        if (data.questions) {
          // Check if plot has any predictions
          const hasPredictions =
            (existingPlot as any).plotPredictions.length > 0;
          if (hasPredictions) {
            throw new HttpException(
              "Cannot update questions that have predictions",
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate number of questions
          if (
            data.numberOfQuestions &&
            data.questions.length !== data.numberOfQuestions
          ) {
            throw new HttpException(
              "Number of questions does not match numberOfQuestions field",
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate question options
          for (const question of data.questions) {
            if (question.type === QuestionType.YES_NO) {
              if (question.options.length !== 2) {
                throw new HttpException(
                  "YES_NO questions must have exactly 2 options",
                  HttpStatus.BAD_REQUEST
                );
              }
            } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
              if (question.options.length !== 4) {
                throw new HttpException(
                  "MULTIPLE_CHOICE questions must have exactly 4 options",
                  HttpStatus.BAD_REQUEST
                );
              }
            }
          }

          // Delete existing questions and options, then create new ones
          await this.prisma.$transaction(async (tx) => {
            await tx.questionOption.deleteMany({
              where: { question: { plotId: existingPlot.id } },
            });
            await tx.question.deleteMany({
              where: { plotId: existingPlot.id },
            });

            for (const questionData of data.questions!) {
              await tx.question.create({
                data: {
                  plotId: existingPlot.id,
                  questionText: questionData.questionText,
                  type: questionData.type,
                  order: questionData.order,
                  options: {
                    create: questionData.options.map((opt) => ({
                      optionText: opt.optionText,
                      order: opt.order,
                    })),
                  },
                },
              });
            }
          });
        }

        // Update plot fields
        const plotUpdateData: any = {};
        if (data.type !== undefined) plotUpdateData.type = data.type;
        if (data.numberOfQuestions !== undefined)
          plotUpdateData.numberOfQuestions = data.numberOfQuestions;
        if (data.activeStartDate !== undefined)
          plotUpdateData.activeStartDate = new Date(data.activeStartDate);
        if (data.activeStartTime !== undefined)
          plotUpdateData.activeStartTime = data.activeStartTime;
        if (data.closeEndDate !== undefined)
          plotUpdateData.closeEndDate = new Date(data.closeEndDate);
        if (data.closeEndTime !== undefined)
          plotUpdateData.closeEndTime = data.closeEndTime;

        // Update show and plot in transaction
        const [updatedShow, updatedPlot] = await this.prisma.$transaction([
          this.prisma.show.update({
            where: { id: showId },
            data: showUpdateData,
          }),
          this.prisma.plot.update({
            where: { id: existingPlot.id },
            data: plotUpdateData,
          }),
        ]);

        plot = updatedPlot;
      } else {
        // Create new plot for this episode
        if (
          !data.questions ||
          !data.type ||
          !data.numberOfQuestions ||
          !data.activeStartDate ||
          !data.activeStartTime ||
          !data.closeEndDate ||
          !data.closeEndTime
        ) {
          throw new HttpException(
            "Questions, type, numberOfQuestions, activeStartDate, activeStartTime, closeEndDate, and closeEndTime are required when creating a new episode",
            HttpStatus.BAD_REQUEST
          );
        }

        // At this point, TypeScript knows these are defined
        const questions = data.questions;
        const type = data.type;
        const numberOfQuestions = data.numberOfQuestions;
        const activeStartDate = data.activeStartDate;
        const activeStartTime = data.activeStartTime;
        const closeEndDate = data.closeEndDate;
        const closeEndTime = data.closeEndTime;

        // Validate number of questions matches
        if (questions.length !== numberOfQuestions) {
          throw new HttpException(
            "Number of questions does not match numberOfQuestions field",
            HttpStatus.BAD_REQUEST
          );
        }

        // Validate question options
        for (const question of questions) {
          if (question.type === QuestionType.YES_NO) {
            if (question.options.length !== 2) {
              throw new HttpException(
                "YES_NO questions must have exactly 2 options",
                HttpStatus.BAD_REQUEST
              );
            }
          } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
            if (question.options.length !== 4) {
              throw new HttpException(
                "MULTIPLE_CHOICE questions must have exactly 4 options",
                HttpStatus.BAD_REQUEST
              );
            }
          }
        }

        // Create plot with questions in transaction
        const result = await this.prisma.$transaction(async (tx) => {
          const updatedShow = await tx.show.update({
            where: { id: showId },
            data: showUpdateData,
          });

          const newPlot = await tx.plot.create({
            data: {
              showId: showId,
              episodeNumber: episodeNumber,
              type: type,
              numberOfQuestions: numberOfQuestions,
              activeStartDate: new Date(activeStartDate),
              activeStartTime: activeStartTime,
              closeEndDate: new Date(closeEndDate),
              closeEndTime: closeEndTime,
              status: PlotStatus.DRAFT,
            },
          });

          // Create questions with options
          for (const questionData of questions) {
            await tx.question.create({
              data: {
                plotId: newPlot.id,
                questionText: questionData.questionText,
                type: questionData.type,
                order: questionData.order,
                options: {
                  create: questionData.options.map((opt: any) => ({
                    optionText: opt.optionText,
                    order: opt.order,
                  })),
                },
              },
            });
          }

          return { updatedShow, newPlot };
        });

        plot = result.newPlot;
      }

      // Fetch complete show with all episodes (plots) ordered by episode number
      const completeShow = await this.prisma.show.findUnique({
        where: { id: showId },
        include: {
          plots: {
            include: {
              questions: {
                include: {
                  options: true,
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { episodeNumber: "asc" }, // Order all episodes by episode number (1, 2, 3, ...)
          },
        },
      });

      return completeShow;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Update show with episode error:", error);
      throw new HttpException(
        error?.message || "Failed to update show with episode",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteShow(showId: string): Promise<{ message: string }> {
    try {
      const show = await this.prisma.show.findUnique({
        where: { id: showId },
        include: { plots: true },
      });

      if (!show) {
        throw new HttpException("Show not found", HttpStatus.NOT_FOUND);
      }

      // Delete all plots (episodes) first - cascade will handle questions/options/predictions
      if (show.plots.length > 0) {
        await this.prisma.plot.deleteMany({
          where: { showId },
        });
      }

      // Delete thumbnail from S3 if exists
      if (show.thumbnailUrl) {
        try {
          const key = this.s3Service.extractKeyFromUrl(show.thumbnailUrl);
          await this.s3Service.deleteFile(key);
        } catch (error) {
          console.error("Failed to delete thumbnail:", error);
        }
      }

      await this.prisma.show.delete({ where: { id: showId } });

      return { message: "Show deleted successfully" };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Delete show error:", error);
      throw new HttpException(
        error?.message || "Failed to delete show",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteEpisode(
    showId: string,
    episodeNumber: number
  ): Promise<{ message: string }> {
    try {
      const plot = await this.prisma.plot.findUnique({
        where: {
          showId_episodeNumber: {
            showId,
            episodeNumber,
          },
        },
        include: {
          questions: {
            include: {
              questionPredictions: true,
            },
          },
          plotPredictions: true,
        },
      });

      if (!plot) {
        throw new HttpException("Episode not found", HttpStatus.NOT_FOUND);
      }

      // Check if episode has predictions
      const hasPredictions = (plot as any).plotPredictions.length > 0;
      if (hasPredictions) {
        throw new HttpException(
          "Cannot delete episode with existing predictions",
          HttpStatus.BAD_REQUEST
        );
      }

      await this.prisma.plot.delete({
        where: {
          showId_episodeNumber: {
            showId,
            episodeNumber,
          },
        },
      });

      return { message: `Episode ${episodeNumber} deleted successfully` };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Delete episode error:", error);
      throw new HttpException(
        error?.message || "Failed to delete episode",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllShows(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [shows, total] = await Promise.all([
        this.prisma.show.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            plots: {
              select: {
                id: true,
                episodeNumber: true,
                type: true,
                status: true,
                createdAt: true,
              },
              orderBy: { episodeNumber: "asc" }, // Order episodes by episode number (1, 2, 3...)
            },
          },
        }),
        this.prisma.show.count(),
      ]);

      return {
        shows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch shows",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getShowById(showId: string) {
    try {
      const show = await this.prisma.show.findUnique({
        where: { id: showId },
        include: {
          plots: {
            include: {
              questions: {
                include: {
                  options: true,
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { episodeNumber: "asc" }, // Order all episodes by episode number (1, 2, 3...)
          },
        },
      });

      if (!show) {
        throw new HttpException("Show not found", HttpStatus.NOT_FOUND);
      }

      return show;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to fetch show",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==================== ADMIN: Plot Management ====================
  // Note: createPlot and updatePlot methods are kept for internal use but not exposed via controller
  // Use createShowWithEpisode and updateShowWithEpisode instead

  async createPlot(data: any): Promise<any> {
    try {
      // Verify show exists
      const show = await this.prisma.show.findUnique({
        where: { id: data.showId },
      });

      if (!show) {
        throw new HttpException("Show not found", HttpStatus.NOT_FOUND);
      }

      // Validate number of questions matches
      if (data.questions.length !== data.numberOfQuestions) {
        throw new HttpException(
          "Number of questions does not match numberOfQuestions field",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate question options based on type
      for (const question of data.questions) {
        if (question.type === QuestionType.YES_NO) {
          if (question.options.length !== 2) {
            throw new HttpException(
              "YES_NO questions must have exactly 2 options",
              HttpStatus.BAD_REQUEST
            );
          }
        } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
          if (question.options.length !== 4) {
            throw new HttpException(
              "MULTIPLE_CHOICE questions must have exactly 4 options",
              HttpStatus.BAD_REQUEST
            );
          }
        }
      }

      // Create plot with questions and options in a transaction
      const plot = await this.prisma.$transaction(async (tx) => {
        // Get the show to determine episode number (for legacy createPlot method)
        const show = await tx.show.findUnique({
          where: { id: data.showId },
        });

        if (!show) {
          throw new HttpException("Show not found", HttpStatus.NOT_FOUND);
        }

        // Get the next episode number for this show
        const existingPlots = await tx.plot.findMany({
          where: { showId: data.showId },
          orderBy: { episodeNumber: "desc" },
          take: 1,
        });

        const nextEpisodeNumber =
          existingPlots.length > 0 ? existingPlots[0].episodeNumber + 1 : 1;

        const newPlot = await tx.plot.create({
          data: {
            showId: data.showId,
            episodeNumber: nextEpisodeNumber,
            type: data.type,
            numberOfQuestions: data.numberOfQuestions,
            activeStartDate: new Date(data.activeStartDate),
            activeStartTime: data.activeStartTime,
            closeEndDate: new Date(data.closeEndDate),
            closeEndTime: data.closeEndTime,
            status: PlotStatus.DRAFT,
          },
        });

        // Create questions with options
        for (const questionData of data.questions) {
          const question = await tx.question.create({
            data: {
              plotId: newPlot.id,
              questionText: questionData.questionText,
              type: questionData.type,
              order: questionData.order,
              options: {
                create: questionData.options.map((opt: any) => ({
                  optionText: opt.optionText,
                  order: opt.order,
                })),
              },
            },
          });
        }

        return newPlot;
      });

      // Fetch the complete plot with questions and options
      const completePlot = await this.prisma.plot.findUnique({
        where: { id: plot.id },
        include: {
          show: true,
          questions: {
            include: {
              options: true,
            },
            orderBy: { order: "asc" },
          },
        },
      });

      return completePlot;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Create plot error:", error);
      throw new HttpException(
        error?.message || "Failed to create plot",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updatePlot(plotId: string, data: any): Promise<any> {
    try {
      const plot = await this.prisma.plot.findUnique({
        where: { id: plotId },
        include: {
          questions: {
            include: {
              questionPredictions: true,
            },
          },
          plotPredictions: true,
        },
      });

      if (!plot) {
        throw new HttpException("Plot not found", HttpStatus.NOT_FOUND);
      }

      // Cannot update if results are announced
      if (plot.status === PlotStatus.RESULTS_ANNOUNCED) {
        throw new HttpException(
          "Cannot update plot after results are announced",
          HttpStatus.BAD_REQUEST
        );
      }

      // If questions are provided, validate and update them
      if (data.questions) {
        // Check if plot has any predictions
        const hasPredictions = (plot as any).plotPredictions.length > 0;
        if (hasPredictions) {
          throw new HttpException(
            "Cannot update questions that have predictions",
            HttpStatus.BAD_REQUEST
          );
        }

        // Validate number of questions
        if (
          data.numberOfQuestions &&
          data.questions.length !== data.numberOfQuestions
        ) {
          throw new HttpException(
            "Number of questions does not match numberOfQuestions field",
            HttpStatus.BAD_REQUEST
          );
        }

        // Validate question options
        for (const question of data.questions) {
          if (question.type === QuestionType.YES_NO) {
            if (question.options.length !== 2) {
              throw new HttpException(
                "YES_NO questions must have exactly 2 options",
                HttpStatus.BAD_REQUEST
              );
            }
          } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
            if (question.options.length !== 4) {
              throw new HttpException(
                "MULTIPLE_CHOICE questions must have exactly 4 options",
                HttpStatus.BAD_REQUEST
              );
            }
          }
        }

        // Delete existing questions and options, then create new ones
        await this.prisma.$transaction(async (tx) => {
          await tx.questionOption.deleteMany({
            where: { question: { plotId: plotId } },
          });
          await tx.question.deleteMany({
            where: { plotId: plotId },
          });

          for (const questionData of data.questions!) {
            await tx.question.create({
              data: {
                plotId: plotId,
                questionText: questionData.questionText,
                type: questionData.type,
                order: questionData.order,
                options: {
                  create: questionData.options.map((opt: any) => ({
                    optionText: opt.optionText,
                    order: opt.order,
                  })),
                },
              },
            });
          }
        });
      }

      // Update plot fields
      const updateData: any = {};
      if (data.showId !== undefined) updateData.showId = data.showId;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.numberOfQuestions !== undefined)
        updateData.numberOfQuestions = data.numberOfQuestions;
      if (data.activeStartDate !== undefined)
        updateData.activeStartDate = new Date(data.activeStartDate);
      if (data.activeStartTime !== undefined)
        updateData.activeStartTime = data.activeStartTime;
      if (data.closeEndDate !== undefined)
        updateData.closeEndDate = new Date(data.closeEndDate);
      if (data.closeEndTime !== undefined)
        updateData.closeEndTime = data.closeEndTime;

      const updatedPlot = await this.prisma.plot.update({
        where: { id: plotId },
        data: updateData,
        include: {
          show: true,
          questions: {
            include: {
              options: true,
            },
            orderBy: { order: "asc" },
          },
        },
      });

      return updatedPlot;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Update plot error:", error);
      throw new HttpException(
        error?.message || "Failed to update plot",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deletePlot(plotId: string): Promise<{ message: string }> {
    try {
      const plot = await this.prisma.plot.findUnique({
        where: { id: plotId },
        include: {
          questions: {
            include: {
              questionPredictions: true,
            },
          },
          plotPredictions: true,
        },
      });

      if (!plot) {
        throw new HttpException("Plot not found", HttpStatus.NOT_FOUND);
      }

      // Check if plot has predictions
      const hasPredictions = plot.plotPredictions.length > 0;
      if (hasPredictions) {
        throw new HttpException(
          "Cannot delete plot with existing predictions",
          HttpStatus.BAD_REQUEST
        );
      }

      await this.prisma.plot.delete({ where: { id: plotId } });

      return { message: "Plot deleted successfully" };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Delete plot error:", error);
      throw new HttpException(
        error?.message || "Failed to delete plot",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async pauseQuestion(questionId: string): Promise<{ message: string }> {
    try {
      const question = await this.prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new HttpException("Question not found", HttpStatus.NOT_FOUND);
      }

      await this.prisma.question.update({
        where: { id: questionId },
        data: { isPaused: true },
      });

      return { message: "Question paused successfully" };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Pause question error:", error);
      throw new HttpException(
        error?.message || "Failed to pause question",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async unpauseQuestion(questionId: string): Promise<{ message: string }> {
    try {
      const question = await this.prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new HttpException("Question not found", HttpStatus.NOT_FOUND);
      }

      await this.prisma.question.update({
        where: { id: questionId },
        data: { isPaused: false },
      });

      return { message: "Question unpaused successfully" };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Unpause question error:", error);
      throw new HttpException(
        error?.message || "Failed to unpause question",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async announceResults(data: AnnounceResultsDto): Promise<any> {
    try {
      const plot = await this.prisma.plot.findUnique({
        where: { id: data.plotId },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });

      if (!plot) {
        throw new HttpException("Plot not found", HttpStatus.NOT_FOUND);
      }

      if (plot.status === PlotStatus.RESULTS_ANNOUNCED) {
        throw new HttpException(
          "Results already announced for this plot",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate all questions have results
      if (data.results.length !== plot.questions.length) {
        throw new HttpException(
          "Results must be provided for all questions",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate each result
      for (const result of data.results) {
        const question = plot.questions.find((q) => q.id === result.questionId);
        if (!question) {
          throw new HttpException(
            `Question ${result.questionId} not found in plot`,
            HttpStatus.BAD_REQUEST
          );
        }

        const option = question.options.find(
          (o) => o.id === result.correctOptionId
        );
        if (!option) {
          throw new HttpException(
            `Option ${result.correctOptionId} not found for question ${result.questionId}`,
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Update all questions with correct options
      await this.prisma.$transaction(
        data.results.map((result) =>
          this.prisma.question.update({
            where: { id: result.questionId },
            data: { correctOptionId: result.correctOptionId },
          })
        )
      );

      // Update plot status
      const updatedPlot = await this.prisma.plot.update({
        where: { id: data.plotId },
        data: { status: PlotStatus.RESULTS_ANNOUNCED },
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
      });

      return updatedPlot;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Announce results error:", error);
      throw new HttpException(
        error?.message || "Failed to announce results",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updatePlotStatus(plotId: string, status: PlotStatus): Promise<any> {
    try {
      const plot = await this.prisma.plot.findUnique({
        where: { id: plotId },
      });

      if (!plot) {
        throw new HttpException("Plot not found", HttpStatus.NOT_FOUND);
      }

      // Validate status transitions
      if (
        plot.status === PlotStatus.RESULTS_ANNOUNCED &&
        status !== PlotStatus.RESULTS_ANNOUNCED
      ) {
        throw new HttpException(
          "Cannot change status after results are announced",
          HttpStatus.BAD_REQUEST
        );
      }

      const updatedPlot = await this.prisma.plot.update({
        where: { id: plotId },
        data: { status },
        include: {
          show: true,
          questions: {
            include: {
              options: true,
            },
            orderBy: { order: "asc" },
          },
        },
      });

      return updatedPlot;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Update plot status error:", error);
      throw new HttpException(
        error?.message || "Failed to update plot status",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllPlots(status?: PlotStatus, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [plots, total] = await Promise.all([
        this.prisma.plot.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            show: true,
            questions: {
              include: {
                options: true,
              },
              orderBy: { order: "asc" },
            },
          },
        }),
        this.prisma.plot.count({ where }),
      ]);

      return {
        plots,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch plots",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getPlotById(plotId: string) {
    try {
      const plot = await this.prisma.plot.findUnique({
        where: { id: plotId },
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
      });

      if (!plot) {
        throw new HttpException("Plot not found", HttpStatus.NOT_FOUND);
      }

      return plot;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to fetch plot",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==================== USER: Plot Viewing ====================

  async getActivePlots(
    page: number = 1,
    limit: number = 20,
    status?: PlotStatus
  ) {
    try {
      const skip = (page - 1) * limit;
      const now = new Date();

      // Build where clause
      const where: any = {};

      // If status filter is provided, use it
      if (status) {
        where.status = status;
        // For ACTIVE plots, also check date/time constraints
        // if (status === PlotStatus.ACTIVE) {
        //   where.activeStartDate = { lte: now };
        //   where.closeEndDate = { gte: now };
        // }
      } else {
        // By default, exclude DRAFT plots (show ACTIVE, CLOSED, RESULTS_ANNOUNCED)
        where.status = {
          not: PlotStatus.DRAFT,
        };
      }

      const [plots, total] = await Promise.all([
        this.prisma.plot.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            show: true,
            questions: {
              where: { isPaused: false },
              include: {
                options: true,
                ...(status === PlotStatus.RESULTS_ANNOUNCED && {
                  correctOption: true,
                }),
              },
              orderBy: { order: "asc" },
            },
          },
        }),
        this.prisma.plot.count({ where }),
      ]);

      return {
        plots,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch plots",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getPlotDetailsForUser(plotId: string, userId?: string) {
    try {
      const plot = await this.prisma.plot.findUnique({
        where: { id: plotId },
        include: {
          show: true,
          questions: {
            where: { isPaused: false },
            include: {
              options: true,
              correctOption: true, // Always include, will be null if not set
            },
            orderBy: { order: "asc" },
          },
          ...(userId && {
            plotPredictions: {
              where: { userId },
              include: {
                questionPredictions: {
                  include: {
                    question: true,
                    option: true,
                  },
                },
              },
            },
          }),
        },
      });

      if (!plot) {
        throw new HttpException("Plot not found", HttpStatus.NOT_FOUND);
      }

      // Check if plot is active and within time window
      const now = new Date();
      const isActive =
        plot.status === PlotStatus.ACTIVE &&
        plot.activeStartDate <= now &&
        plot.closeEndDate >= now;

      // Check if user has already predicted
      const hasPredicted =
        userId && plot.plotPredictions && plot.plotPredictions.length > 0;

      return {
        ...plot,
        isActive,
        canPredict:
          isActive &&
          plot.status !== PlotStatus.RESULTS_ANNOUNCED &&
          !hasPredicted,
        userPrediction: hasPredicted ? (plot as any).plotPredictions[0] : null,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || "Failed to fetch plot details",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==================== USER: Predictions ====================

  async createPrediction(
    userId: string,
    data: CreatePredictionDto
  ): Promise<any> {
    try {
      // Verify plot exists and get all questions
      const plot = await this.prisma.plot.findUnique({
        where: { id: data.plotId },
        include: {
          show: true,
          questions: {
            where: { isPaused: false },
            include: {
              options: true,
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!plot) {
        throw new HttpException("Plot not found", HttpStatus.NOT_FOUND);
      }

      // Check if plot is active and within time window
      const now = new Date();
      if (
        plot.status !== PlotStatus.ACTIVE ||
        plot.activeStartDate > now ||
        plot.closeEndDate < now
      ) {
        throw new HttpException(
          "Plot is not active or outside prediction window",
          HttpStatus.BAD_REQUEST
        );
      }

      // Note: If status is ACTIVE, it cannot be RESULTS_ANNOUNCED, so no need to check again

      // Validate predicted amount
      const minAmount = Number(plot.show.minimumAmount);
      const maxAmount = Number(plot.show.maximumAmount);
      if (
        data.predictedAmount < minAmount ||
        data.predictedAmount > maxAmount
      ) {
        throw new HttpException(
          `Predicted amount must be between ${minAmount} and ${maxAmount}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Check if user already predicted on this plot
      const existingPrediction = await this.prisma.plotPrediction.findUnique({
        where: {
          userId_plotId: {
            userId,
            plotId: data.plotId,
          },
        },
      });

      if (existingPrediction) {
        throw new HttpException(
          "You have already predicted on this plot",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate that all questions in the plot have selections
      if (data.selections.length !== plot.questions.length) {
        throw new HttpException(
          `You must provide selections for all ${plot.questions.length} questions`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate all selections
      const questionIds = new Set(plot.questions.map((q) => q.id));
      const selectionQuestionIds = new Set(
        data.selections.map((s) => s.questionId)
      );

      // Check if all questions are covered
      if (questionIds.size !== selectionQuestionIds.size) {
        throw new HttpException(
          "Selections must include all questions in the plot",
          HttpStatus.BAD_REQUEST
        );
      }

      // Check for duplicate question selections
      if (selectionQuestionIds.size !== data.selections.length) {
        throw new HttpException(
          "Duplicate question selections are not allowed",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate each selection
      for (const selection of data.selections) {
        const question = plot.questions.find(
          (q) => q.id === selection.questionId
        );
        if (!question) {
          throw new HttpException(
            `Question ${selection.questionId} does not belong to this plot`,
            HttpStatus.BAD_REQUEST
          );
        }

        if (question.isPaused) {
          throw new HttpException(
            `Question ${selection.questionId} is paused`,
            HttpStatus.BAD_REQUEST
          );
        }

        const option = question.options.find(
          (o) => o.id === selection.optionId
        );
        if (!option) {
          throw new HttpException(
            `Option ${selection.optionId} does not belong to question ${selection.questionId}`,
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Create plot prediction with all question predictions in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create plot prediction
        const plotPrediction = await tx.plotPrediction.create({
          data: {
            userId,
            plotId: data.plotId,
            predictedAmount: data.predictedAmount,
          },
        });

        // Create question predictions
        for (const selection of data.selections) {
          await tx.questionPrediction.create({
            data: {
              plotPredictionId: plotPrediction.id,
              questionId: selection.questionId,
              optionId: selection.optionId,
            },
          });
        }

        return plotPrediction;
      });

      // Fetch complete prediction with all details
      const completePrediction = await this.prisma.plotPrediction.findUnique({
        where: { id: result.id },
        include: {
          plot: {
            include: {
              show: true,
            },
          },
          questionPredictions: {
            include: {
              question: {
                include: {
                  options: true,
                },
              },
              option: true,
            },
          },
        },
      });

      if (!completePrediction) {
        throw new HttpException(
          "Failed to fetch created prediction",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Sort question predictions by question order
      if (completePrediction.questionPredictions) {
        completePrediction.questionPredictions.sort(
          (a, b) => a.question.order - b.question.order
        );
      }

      return completePrediction;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Create prediction error:", error);
      throw new HttpException(
        error?.message || "Failed to create prediction",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserPredictions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      const [predictions, total] = await Promise.all([
        this.prisma.plotPrediction.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            plot: {
              include: {
                show: true,
                questions: {
                  include: {
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
                    correctOption: true,
                  },
                },
                option: true,
              },
            },
          },
        }),
        this.prisma.plotPrediction.count({ where: { userId } }),
      ]);

      // Sort question predictions by question order for each prediction
      predictions.forEach((prediction) => {
        if (prediction.questionPredictions) {
          prediction.questionPredictions.sort(
            (a, b) => a.question.order - b.question.order
          );
        }
      });

      return {
        predictions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch user predictions",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserPlots(userId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      // Get all plot IDs where user has made predictions
      const plotPredictions = await this.prisma.plotPrediction.findMany({
        where: { userId },
        select: {
          plotId: true,
        },
        distinct: ["plotId"],
      });

      const plotIds = plotPredictions.map((p) => p.plotId);

      if (plotIds.length === 0) {
        return {
          plots: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const [plots, total] = await Promise.all([
        this.prisma.plot.findMany({
          where: {
            id: { in: plotIds },
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            show: true,
            questions: {
              include: {
                options: true,
                correctOption: true,
              },
              orderBy: { order: "asc" },
            },
            plotPredictions: {
              where: { userId },
              include: {
                questionPredictions: {
                  include: {
                    question: true,
                    option: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.plot.count({
          where: {
            id: { in: plotIds },
          },
        }),
      ]);

      // Sort question predictions by question order for each plot prediction
      plots.forEach((plot) => {
        if (plot.plotPredictions && plot.plotPredictions.length > 0) {
          plot.plotPredictions.forEach((plotPrediction) => {
            if (plotPrediction.questionPredictions) {
              plotPrediction.questionPredictions.sort(
                (a, b) => a.question.order - b.question.order
              );
            }
          });
        }
      });

      return {
        plots,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Failed to fetch user plots",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
