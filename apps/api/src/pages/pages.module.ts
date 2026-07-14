import { Module } from "@nestjs/common";
import { PagesController } from "./pages.controller";
import { AdminPagesController } from "./admin-pages.controller";
import { PagesService } from "./pages.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService],
})
export class PagesModule {}
