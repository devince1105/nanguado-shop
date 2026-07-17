import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "請輸入有效的電子郵件" })
  @IsNotEmpty({ message: "電子郵件不可為空" })
  email!: string;

  @IsString({ message: "密碼必須為字串" })
  @IsNotEmpty({ message: "密碼不可為空" })
  password!: string;

  @IsString({ message: "sessionId 必須為字串" })
  @IsOptional()
  sessionId?: string;
}
