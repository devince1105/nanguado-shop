import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { getDb, users } from "@repo/db";
import { eq } from "drizzle-orm";
import { verifyAuthToken, type AuthTokenPayload } from "./jwt.util";

/**
 * 管理員守衛：驗證 JWT 後再向資料庫確認 role=admin。
 * 以資料庫為準，角色被撤銷時舊 token 立即失效。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("未登入或憑證缺失");
    }

    let decoded: AuthTokenPayload;
    try {
      decoded = verifyAuthToken(authHeader.split(" ")[1]);
    } catch {
      throw new UnauthorizedException("憑證無效或已過期");
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });
    if (!user) {
      throw new UnauthorizedException("使用者不存在");
    }
    if (user.role !== "admin") {
      throw new ForbiddenException("需要管理員權限");
    }

    request.user = { userId: user.id, email: user.email, role: user.role };
    return true;
  }
}
