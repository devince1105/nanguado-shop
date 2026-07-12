import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { OrdersService, type CreateOrderDto } from "./orders.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { getUserIdFromAuthHeader } from "../auth/jwt.util";

function getUserIdFromRequest(req: any): string | undefined {
  return getUserIdFromAuthHeader(req.headers.authorization);
}

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    const userId = getUserIdFromRequest(req);
    return this.ordersService.create({ ...dto, userId });
  }

  @Get()
  @UseGuards(AuthGuard)
  getByUser(@CurrentUser() user: { userId: string }) {
    return this.ordersService.getByUserId(user.userId);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.ordersService.getById(id);
  }
}
