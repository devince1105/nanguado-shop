import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class GoogleLoginDto {
  @IsString({ message: "Google 憑證必須為字串" })
  @IsNotEmpty({ message: "缺少 Google 憑證" })
  credential!: string;

  @IsString({ message: "sessionId 必須為字串" })
  @IsOptional()
  sessionId?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: "請輸入有效的電子郵件" })
  @IsNotEmpty({ message: "電子郵件不可為空" })
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: "請輸入有效的電子郵件" })
  @IsNotEmpty({ message: "電子郵件不可為空" })
  email!: string;

  @IsString({ message: "驗證碼必須為字串" })
  @IsNotEmpty({ message: "請輸入驗證碼" })
  code!: string;

  @IsString({ message: "新密碼必須為字串" })
  @IsNotEmpty({ message: "新密碼不可為空" })
  @MinLength(6, { message: "密碼長度至少需為 6 個字元" })
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString({ message: "目前密碼必須為字串" })
  @IsNotEmpty({ message: "請提供目前密碼" })
  oldPassword!: string;

  @IsString({ message: "新密碼必須為字串" })
  @IsNotEmpty({ message: "請提供新密碼" })
  @MinLength(6, { message: "新密碼長度至少需為 6 個字元" })
  newPassword!: string;
}

export class SendVerificationDto {
  @IsEmail({}, { message: "請輸入有效的電子郵件" })
  @IsNotEmpty({ message: "電子郵件不可為空" })
  email!: string;
}

export class UpdateProfileDto {
  @IsString({ message: "姓名必須為字串" })
  @IsNotEmpty({ message: "請提供姓名" })
  name!: string;

  @IsString({ message: "電話必須為字串" })
  @IsOptional()
  phone?: string;

  @IsString({ message: "地址必須為字串" })
  @IsOptional()
  address?: string;
}
