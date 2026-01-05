import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewSortBy {
    RECENT = 'recent',
    RATING = 'rating',
    HELPFUL = 'helpful',
}

export class ReviewQueryDto {
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @IsOptional()
    limit?: number = 10;

    @IsEnum(ReviewSortBy)
    @IsOptional()
    sortBy?: ReviewSortBy = ReviewSortBy.RECENT;
}
