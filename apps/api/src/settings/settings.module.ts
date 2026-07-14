import { Module } from "@nestjs/common";
import {
  SettingsController,
  AdminSettingsController,
} from "./settings.controller";
import { SettingsService } from "./settings.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
