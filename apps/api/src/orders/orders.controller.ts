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
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nanguado-pumpkin-shop-jwt-secret-key-12345";

function getUserIdFromRequest(req: any): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch {
      // 憑證錯誤或過期，當作訪客處理
    }
  }
  return undefined;
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
