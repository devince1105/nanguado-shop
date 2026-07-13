import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ReviewsService,
  type CreateReviewDto,
} from "./reviews.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("products/:slug/reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Param("slug") slug: string) {
    return this.reviewsService.listBySlug(slug);
  }

  @Get("eligibility")
  @UseGuards(AuthGuard)
  eligibility(
    @Param("slug") slug: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.reviewsService.eligibility(slug, user.userId);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Param("slug") slug: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.reviewsService.create(slug, user.userId, dto);
  }
}
