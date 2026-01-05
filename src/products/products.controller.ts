import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    Req,
    Put,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
// import { FilesInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY)
    // @UseInterceptors(FilesInterceptor('images', 5))
    create(
        @Body() createProductDto: CreateProductDto,
        @Req() req: any,
        /* @UploadedFiles() */ files?: any[],
    ) {
        return this.productsService.create(createProductDto, req.user, files);
    }

    @Get()
    findAll(@Query() query: ProductQueryDto) {
        return this.productsService.findAll(query);
    }

    @Get('categories')
    getCategories() {
        return this.productsService.getCategories();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY)
    // @UseInterceptors(FilesInterceptor('images', 5))
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @Req() req: any,
        /* @UploadedFiles() */ files?: any[],
    ) {
        return this.productsService.update(id, updateProductDto, req.user, files);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY)
    remove(@Param('id') id: string, @Req() req: any) {
        return this.productsService.remove(id, req.user);
    }

    @Patch(':id/stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY, UserRole.ACCOUNTANT)
    updateStock(
        @Param('id') id: string,
        @Body('availableStock') availableStock: number,
        @Req() req: any,
    ) {
        return this.productsService.updateStock(id, availableStock, req.user);
    }
}
