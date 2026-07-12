import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ProductsService,
  type ListProductsQuery,
} from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("sort") sort?: ListProductsQuery["sort"],
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.productsService.list({
      category,
      search,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(":slug")
  getBySlug(@Param("slug") slug: string) {
    return this.productsService.getBySlug(slug);
  }
}
