import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { getDb, users, verificationCodes } from "@repo/db";
import { eq, and, gte, desc } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as nodemailer from "nodemailer";
import { randomUUID } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { CartService } from "../cart/cart.service";
import { signAuthToken } from "./jwt.util";

@Injectable()
export class AuthService {
  constructor(private readonly cartService: CartService) {}

  async register(dto: any) {
    const { email, password, name, phone, address, code } = dto;
    if (!email || !password || !name || !code) {
      throw new BadRequestException("請提供 Email、密碼、姓名與驗證碼");
    }

    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();

    // 驗證 OTP 驗證碼是否正確且未過期
    const validOtp = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.email, cleanEmail),
        eq(verificationCodes.code, code.trim()),
        gte(verificationCodes.expiresAt, new Date())
      ),
      orderBy: desc(verificationCodes.createdAt),
    });

    if (!validOtp) {
      throw new BadRequestException("驗證碼不正確或已過期");
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });
    if (existing) {
      throw new BadRequestException("該 Email 已經被註冊");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: cleanEmail,
        passwordHash,
        name,
        phone: phone || null,
        address: address || null,
        isEmailVerified: true,
      })
      .returning();

    // 刪除此 Email 的所有驗證碼防重複使用
    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.email, cleanEmail));

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    };
  }

  async sendVerificationCode(email: string) {
    if (!email?.trim()) {
      throw new BadRequestException("請提供 Email");
    }
    const cleanEmail = email.toLowerCase().trim();

    const db = getDb();
    // 檢查是否已被註冊
    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });
    if (existing) {
      throw new BadRequestException("該 Email 已經被註冊");
    }

    // 產生 6 位數隨機驗證碼
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分鐘過期

    // 寫入資料庫
    await db.insert(verificationCodes).values({
      email: cleanEmail,
      code,
      expiresAt,
    });

    // 寄送 Email (如果 SMTP 環境變數未設定，則 Mock console 輸出)
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"南瓜多 Shop" <no-reply@nanguado.shop>`;

    if (host && port && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });

        await transporter.sendMail({
          from,
          to: cleanEmail,
          subject: "【南瓜多 Shop】會員註冊驗證信",
          html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">🎃 南瓜多 Shop 會員註冊</h2>
              <p>您好，感謝您註冊南瓜多 Shop！以下是您的註冊驗證碼：</p>
              <div style="background-color: #fff7ed; border: 1px dashed #fdba74; padding: 15px; text-align: center; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #c2410c;">${code}</span>
              </div>
              <p style="color: #666; font-size: 14px;">此驗證碼有效期限為 10 分鐘，請儘速於註冊頁面中完成驗證。如果您沒有進行此項操作，請忽略此郵件。</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px; text-align: center;">南瓜多 Shop 團隊 敬上</p>
            </div>
          `,
        });
        console.log(`[SMTP] 成功發送驗證信至 ${cleanEmail}`);
      } catch (err) {
        console.error(`[SMTP] 發送驗證信至 ${cleanEmail} 失敗:`, err);
        throw new BadRequestException("發送驗證信失敗，請稍後再試");
      }
    } else {
      // 開發/模擬模式
      console.log(`\n========================================`);
      console.log(`[SMTP Mock] 寄送驗證碼至 ${cleanEmail}`);
      console.log(`驗證碼 (OTP Code)：${code}`);
      console.log(`有效期限至：${expiresAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`);
      console.log(`========================================\n`);
    }

    return { success: true, message: "驗證碼已發送" };
  }

  /** 忘記密碼：寄送重設驗證碼（不透露 email 是否存在，一律回成功） */
  async sendPasswordResetCode(email: string) {
    if (!email?.trim()) {
      throw new BadRequestException("請提供 Email");
    }
    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();

    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    // 找不到會員也回成功（避免 email 列舉），但不寄信
    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await db.insert(verificationCodes).values({
        email: cleanEmail,
        code,
        expiresAt,
      });
      await this.deliverResetEmail(cleanEmail, code);
    }

    return { success: true, message: "若該 Email 已註冊，重設驗證碼已寄出" };
  }

  private async deliverResetEmail(email: string, code: string) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"南瓜多 Shop" <no-reply@nanguado.shop>`;

    if (host && port && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        await transporter.sendMail({
          from,
          to: email,
          subject: "【南瓜多 Shop】密碼重設驗證碼",
          html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">🎃 密碼重設</h2>
              <p>您好，以下是您的密碼重設驗證碼：</p>
              <div style="background-color: #fff7ed; border: 1px dashed #fdba74; padding: 15px; text-align: center; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #c2410c;">${code}</span>
              </div>
              <p style="color: #666; font-size: 14px;">驗證碼 10 分鐘內有效。若您並未申請重設密碼，請忽略此信。</p>
            </div>
          `,
        });
        console.log(`[SMTP] 密碼重設驗證信已寄至 ${email}`);
      } catch (err) {
        console.error(`[SMTP] 密碼重設信寄送失敗 ${email}:`, err);
        throw new BadRequestException("發送驗證信失敗，請稍後再試");
      }
    } else {
      console.log(`\n===== [密碼重設 Mock] =====`);
      console.log(`Email：${email}`);
      console.log(`重設驗證碼：${code}`);
      console.log(`==========================\n`);
    }
  }

  /** 以驗證碼重設密碼 */
  async resetPassword(dto: {
    email?: string;
    code?: string;
    newPassword?: string;
  }) {
    const { email, code, newPassword } = dto;
    if (!email || !code || !newPassword) {
      throw new BadRequestException("請提供 Email、驗證碼與新密碼");
    }
    if (newPassword.length < 6) {
      throw new BadRequestException("密碼長度至少 6 碼");
    }
    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();

    const validOtp = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.email, cleanEmail),
        eq(verificationCodes.code, code.trim()),
        gte(verificationCodes.expiresAt, new Date()),
      ),
      orderBy: desc(verificationCodes.createdAt),
    });
    if (!validOtp) {
      throw new BadRequestException("驗證碼錯誤或已過期");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });
    if (!user) {
      throw new BadRequestException("查無此帳號");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    // 清除該 email 的所有驗證碼
    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.email, cleanEmail));

    return { success: true, message: "密碼已重設，請以新密碼登入" };
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

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    };
  }

  /** Google 第三方登入：驗證 Google ID Token，找不到會員則建立 */
  async googleLogin(dto: { credential?: string; sessionId?: string }) {
    const { credential, sessionId } = dto;
    if (!credential) {
      throw new BadRequestException("缺少 Google 憑證");
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new InternalServerErrorException("尚未設定 GOOGLE_CLIENT_ID");
    }

    const client = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException("Google 驗證失敗");
    }

    const email = payload?.email?.toLowerCase().trim();
    if (!email || !payload?.email_verified) {
      throw new UnauthorizedException("無法取得已驗證的 Google 電子郵件");
    }
    const name = payload.name ?? email.split("@")[0];

    const db = getDb();
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // 找不到會員 → 以 Google 資料建立（無密碼，用隨機 hash 占位、email 視為已驗證）
    if (!user) {
      const placeholderHash = await bcrypt.hash(randomUUID(), 10);
      const [created] = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash: placeholderHash,
          role: "customer",
          isEmailVerified: true,
        })
        .returning();
      user = created;
    }

    if (sessionId) {
      try {
        await this.cartService.mergeCart(sessionId, user.id);
      } catch (err) {
        console.error("合併購物車失敗:", err);
      }
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        role: user.role,
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
      role: user.role,
    };
  }

  async changePassword(userId: string, dto: any) {
    const { oldPassword, newPassword } = dto;
    if (!oldPassword || !newPassword) {
      throw new BadRequestException("請提供目前密碼與新密碼");
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      throw new UnauthorizedException("使用者不存在");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException("目前的密碼不正確");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));

    return { success: true };
  }

  async updateProfile(userId: string, dto: any) {
    const { name, phone, address } = dto;
    if (!name?.trim()) {
      throw new BadRequestException("請提供姓名");
    }

    const db = getDb();
    const [updatedUser] = await db
      .update(users)
      .set({
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new UnauthorizedException("使用者不存在");
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      address: updatedUser.address,
      role: updatedUser.role,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    return signAuthToken({ userId, email, role });
  }
}
