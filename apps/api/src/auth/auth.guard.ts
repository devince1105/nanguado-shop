import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyAuthToken } from "./jwt.util";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("未登入或憑證缺失");
    }

    const token = authHeader.split(" ")[1];
    try {
      request.user = verifyAuthToken(token);
      return true;
    } catch (err) {
      throw new UnauthorizedException("憑證無效或已過期");
    }
  }
}
