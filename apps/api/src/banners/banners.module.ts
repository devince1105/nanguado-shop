import { Module } from "@nestjs/common";
import {
  BannersController,
  AdminBannersController,
} from "./banners.controller";
import { BannersService } from "./banners.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [BannersController, AdminBannersController],
  providers: [BannersService],
})
export class BannersModule {}
