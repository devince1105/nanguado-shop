import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminUsersService } from "./admin-users.service";

@Controller("admin/users")
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  list(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminUsersService.list({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(":id/orders")
  listOrders(@Param("id") id: string) {
    return this.adminUsersService.listOrders(id);
  }

  @Patch(":id/role")
  updateRole(
    @Param("id") id: string,
    @Body() body: { role: string },
    @CurrentUser() operator: { userId: string },
  ) {
    return this.adminUsersService.updateRole(id, body?.role, operator.userId);
  }

  @Delete(":id")
  remove(
    @Param("id") id: string,
    @CurrentUser() operator: { userId: string },
  ) {
    return this.adminUsersService.remove(id, operator.userId);
  }
}
