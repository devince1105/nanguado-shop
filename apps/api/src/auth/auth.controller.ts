import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  SendVerificationDto,
  UpdateProfileDto,
  GoogleLoginDto,
} from "./dto/auth-others.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("google")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  googleLogin(@Body() body: GoogleLoginDto) {
    return this.authService.googleLogin(body);
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.sendPasswordResetCode(body.email);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resetPassword(
    @Body() body: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(body);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser() user: { userId: string }) {
    return this.authService.getMe(user.userId);
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  changePassword(
    @CurrentUser() user: { userId: string },
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, body);
  }

  @Post("send-verification")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  sendVerification(@Body() body: SendVerificationDto) {
    return this.authService.sendVerificationCode(body.email);
  }

  @Patch("profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() body: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.userId, body);
  }
}
