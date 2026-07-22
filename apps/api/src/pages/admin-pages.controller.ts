import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminGuard } from "../auth/admin.guard";
import { PagesService } from "./pages.service";

@ApiTags("Admin - Pages")
@ApiBearerAuth()
@Controller("admin/pages")
@UseGuards(AdminGuard)
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  list() {
    return this.pagesService.adminList();
  }

  @Patch(":slug")
  update(
    @Param("slug") slug: string,
    @Body() dto: { title?: string; content?: string },
  ) {
    return this.pagesService.update(slug, dto);
  }
}
