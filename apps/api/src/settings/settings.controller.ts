import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { SettingsService, type SiteSettings } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** 公開：前台讀取店名 / 標語等設定 */
  @Get()
  getPublic() {
    return this.settingsService.getAll();
  }
}

@Controller("admin/settings")
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.getAll();
  }

  @Patch()
  update(@Body() dto: Partial<SiteSettings>) {
    return this.settingsService.update(dto);
  }
}
