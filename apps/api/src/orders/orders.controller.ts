import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
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

  // 需登入，且只能查自己的訂單（防止靠 id 存取他人訂單/個資的 IDOR）
  @Get(":id")
  @UseGuards(AuthGuard)
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const order = await this.ordersService.getById(id);
    if (order.userId !== user.userId) {
      // 回 404 而非 403，避免洩漏訂單是否存在
      throw new NotFoundException(`找不到訂單：${id}`);
    }
    return order;
  }

  @Post(":id/repay")
  @UseGuards(AuthGuard)
  repay(@Param("id") id: string, @CurrentUser() user: { userId: string }) {
    return this.ordersService.repay(id, user.userId);
  }
}
