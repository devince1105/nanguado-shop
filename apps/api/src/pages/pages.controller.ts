import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PagesService } from "./pages.service";

@ApiTags("Pages")
@Controller("pages")
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get(":slug")
  getBySlug(@Param("slug") slug: string) {
    return this.pagesService.getBySlug(slug);
  }
}
