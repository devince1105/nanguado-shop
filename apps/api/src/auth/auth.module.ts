import { Module, forwardRef } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CartModule } from "../cart/cart.module";
import { AuthGuard } from "./auth.guard";

@Module({
  imports: [forwardRef(() => CartModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
