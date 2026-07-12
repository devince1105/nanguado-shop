import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { CartService, type AddCartItemDto } from "./cart.service";
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
      // 容忍憑證錯誤或過期，視同訪客
    }
  }
  return undefined;
}

@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Query("sessionId") sessionId: string, @Req() req: any) {
    const userId = getUserIdFromRequest(req);
    return this.cartService.getCart(sessionId, userId);
  }

  @Post("items")
  addItem(@Body() dto: AddCartItemDto, @Req() req: any) {
    const userId = getUserIdFromRequest(req);
    return this.cartService.addItem({ ...dto, userId });
  }

  @Patch("items/:id")
  updateItem(@Param("id") id: string, @Body() body: { quantity: number }) {
    return this.cartService.updateItem(id, body?.quantity);
  }

  @Delete("items/:id")
  removeItem(@Param("id") id: string) {
    return this.cartService.removeItem(id);
  }
}
