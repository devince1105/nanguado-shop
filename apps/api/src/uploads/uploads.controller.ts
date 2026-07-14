import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminGuard } from "../auth/admin.guard";
import { UploadsService, type UploadedImage } from "./uploads.service";

@Controller("admin/uploads")
@UseGuards(AdminGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /** 後台上傳商品圖片（multipart/form-data，欄位名 file），回傳公開 URL */
  @Post()
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  upload(@UploadedFile() file: UploadedImage) {
    return this.uploadsService.uploadProductImage(file);
  }
}
