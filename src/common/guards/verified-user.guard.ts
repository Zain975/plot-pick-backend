import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

/**
 * Guard that ensures the user has completed full onboarding (signupStep === 3)
 * Use this guard for operations that require complete user verification
 */
@Injectable()
export class VerifiedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    if (user.role !== "user") {
      throw new ForbiddenException("User access required");
    }

    // Check if user has completed full onboarding (signupStep === 3)
    if (user.signupStep !== 3) {
      throw new ForbiddenException(
        "Please complete your onboarding to access this feature"
      );
    }

    return true;
  }
}
