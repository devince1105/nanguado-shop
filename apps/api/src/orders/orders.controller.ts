import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { OrdersService, type CreateOrderDto } from "./orders.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 下單必須登入（一般會員或 Google 皆可）：訂單一律歸戶，不再收訪客單
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: { userId: string }) {
    return this.ordersService.create({ ...dto, userId: user.userId });
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

  @Post(":id/repay")
  @UseGuards(AuthGuard)
  repay(@Param("id") id: string, @CurrentUser() user: { userId: string }) {
    return this.ordersService.repay(id, user.userId);
  }
}
