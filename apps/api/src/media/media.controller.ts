import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminGuard } from "../auth/admin.guard";
import { MediaService, type UploadedImage } from "./media.service";

@ApiTags("Admin - Media")
@ApiBearerAuth()
@Controller("admin/media")
@UseGuards(AdminGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("folder") folder?: string,
    @Query("tag") tag?: string,
  ) {
    return this.mediaService.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      folder,
      tag,
    });
  }

  /** 篩選用的資料夾清單與標籤 */
  @Get("meta")
  meta() {
    return this.mediaService.meta();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  upload(
    @UploadedFile() file: UploadedImage,
    @Body("folder") folder?: string,
  ) {
    return this.mediaService.upload(file, "products", folder);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body()
    dto: { alt?: string; caption?: string; folder?: string | null; tags?: string[] },
  ) {
    return this.mediaService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.mediaService.remove(id);
  }
}
