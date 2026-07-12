import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CartService, type AddCartItemDto } from "./cart.service";

@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Query("sessionId") sessionId: string) {
    return this.cartService.getCart(sessionId);
  }

  @Post("items")
  addItem(@Body() dto: AddCartItemDto) {
    return this.cartService.addItem(dto);
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
