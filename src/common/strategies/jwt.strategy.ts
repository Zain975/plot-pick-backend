import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../database/prisma.service";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "your-secret-key",
    });
  }

  async validate(payload: JwtPayload) {
    const { sub, role } = payload;

    try {
      if (role === "admin") {
        const admin = await this.prisma.admin.findUnique({
          where: { id: sub },
        });
        if (!admin) {
          throw new UnauthorizedException("Admin not found");
        }
        return { id: admin.id, email: admin.email, role: "admin" };
      } else if (role === "user") {
        const user = await this.prisma.user.findUnique({
          where: { id: sub },
        });
        if (!user) {
          throw new UnauthorizedException("User not found");
        }
        return { id: user.id, email: user.email, role: "user" };
      }

      throw new UnauthorizedException("Invalid token role");
    } catch (error: any) {
      // Handle database connection errors
      if (
        error?.code === "P1001" ||
        error?.message?.includes("Can't reach database server")
      ) {
        console.error("Database connection error:", error.message);
        throw new UnauthorizedException(
          "Database connection failed. Please try again later."
        );
      }
      // Re-throw other errors
      throw error;
    }
  }
}
