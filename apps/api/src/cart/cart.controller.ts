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
import { getUserIdFromAuthHeader } from "../auth/jwt.util";

function getUserIdFromRequest(req: any): string | undefined {
  return getUserIdFromAuthHeader(req.headers.authorization);
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
