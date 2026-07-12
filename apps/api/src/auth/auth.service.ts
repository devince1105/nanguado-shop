import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { getDb, users } from "@repo/db";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { CartService } from "../cart/cart.service";

const JWT_SECRET = process.env.JWT_SECRET || "nanguado-pumpkin-shop-jwt-secret-key-12345";

@Injectable()
export class AuthService {
  constructor(private readonly cartService: CartService) {}

  async register(dto: any) {
    const { email, password, name, phone, address } = dto;
    if (!email || !password || !name) {
      throw new BadRequestException("請提供 Email、密碼與姓名");
    }

    const db = getDb();
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });
    if (existing) {
      throw new BadRequestException("該 Email 已經被註冊");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        phone: phone || null,
        address: address || null,
      })
      .returning();

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
      },
    };
  }

  async login(dto: any) {
    const { email, password, sessionId } = dto;
    if (!email || !password) {
      throw new BadRequestException("請提供 Email 與密碼");
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
      throw new UnauthorizedException("電子郵件或密碼錯誤");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("電子郵件或密碼錯誤");
    }

    // 合併購物車
    if (sessionId) {
      try {
        await this.cartService.mergeCart(sessionId, user.id);
      } catch (err) {
        console.error("合併購物車失敗:", err);
      }
    }

    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
      },
    };
  }

  async getMe(userId: string) {
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      throw new UnauthorizedException("使用者不存在");
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
    };
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
  }
}
