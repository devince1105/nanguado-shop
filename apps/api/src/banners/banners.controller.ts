import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { BannersService, type BannerDto } from "./banners.service";

@Controller("banners")
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  /** 公開：前台首頁輪播 */
  @Get()
  list() {
    return this.bannersService.listActive();
  }
}

@Controller("admin/banners")
@UseGuards(AdminGuard)
export class AdminBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  list() {
    return this.bannersService.listAll();
  }

  @Post()
  create(@Body() dto: BannerDto) {
    return this.bannersService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: BannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.bannersService.remove(id);
  }
}
