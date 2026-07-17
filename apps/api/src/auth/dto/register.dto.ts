import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "請輸入有效的電子郵件" })
  @IsNotEmpty({ message: "電子郵件不可為空" })
  email!: string;

  @IsString({ message: "密碼必須為字串" })
  @IsNotEmpty({ message: "密碼不可為空" })
  @MinLength(6, { message: "密碼長度至少需為 6 個字元" })
  password!: string;

  @IsString({ message: "姓名必須為字串" })
  @IsNotEmpty({ message: "姓名不可為空" })
  name!: string;

  @IsString({ message: "驗證碼必須為字串" })
  @IsNotEmpty({ message: "請輸入驗證碼" })
  code!: string;

  @IsString({ message: "電話必須為字串" })
  @IsOptional()
  phone?: string;

  @IsString({ message: "地址必須為字串" })
  @IsOptional()
  address?: string;
}
