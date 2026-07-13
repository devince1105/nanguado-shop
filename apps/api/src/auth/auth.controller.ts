import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post("login")
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: { userId: string }) {
    return this.authService.getMe(user.userId);
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  changePassword(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
  ) {
    return this.authService.changePassword(user.userId, body);
  }

  @Post("send-verification")
  sendVerification(@Body() body: { email: string }) {
    return this.authService.sendVerificationCode(body?.email);
  }

  @Patch("profile")
  @UseGuards(AuthGuard)
  updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() body: any,
  ) {
    return this.authService.updateProfile(user.userId, body);
  }
}
