import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UploadService } from '../common/services/upload.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
    constructor(
        private prisma: PrismaService,
        private uploadService: UploadService,
    ) { }

    async create(createProductDto: CreateProductDto, user: any, files?: any[]) {
        // Check authorization (though controller/guard usually handles existence, we check business logic here)
        if (!user.cooperativeId) {
            throw new ForbiddenException('User is not associated with a cooperative');
        }

        const { shippingCost, ...restOfProductData } = createProductDto;

        // Upload product images
        let images: string[] = [];
        if (files && files.length > 0) {
            images = await this.uploadService.uploadMultipleImages(files, 'products');
        }

        const product = await this.prisma.product.create({
            data: {
                ...restOfProductData,
                price: Number(createProductDto.price), // Ensure number
                availableStock: Number(createProductDto.availableStock), // Ensure number
                shippingCost: shippingCost ? Number(shippingCost) : 0,
                cooperativeId: user.cooperativeId,
                images,
                isActive: true,
            },
        });

        // Log activity
        await this.prisma.activityLog.create({
            data: {
                userId: user.id,
                cooperativeId: user.cooperativeId,
                action: 'PRODUCT_CREATED',
                entity: 'PRODUCT',
                entityId: product.id,
            },
        });

        return product;
    }

    async findAll(query: ProductQueryDto) {
        const {
            category,
            cooperativeId,
            search,
            page = 1,
            limit = 20,
            minPrice,
            maxPrice,
            quality,
            location,
            sortBy = 'recent',
            inStock,
        } = query;

        const andConditions: Prisma.ProductWhereInput[] = [{ isActive: true }];

        if (cooperativeId) {
            andConditions.push({ cooperativeId });
        }

        if (category && category !== 'all') {
            andConditions.push({ category });
        }

        // Price filter
        if (minPrice || maxPrice) {
            const priceFilter: Prisma.FloatFilter = {};
            if (minPrice) priceFilter.gte = Number(minPrice);
            if (maxPrice) priceFilter.lte = Number(maxPrice);
            andConditions.push({ price: priceFilter });
        }

        if (quality && quality !== 'all') {
            andConditions.push({ quality });
        }

        if (location && location.trim() && location !== 'all') {
            const locationTerm = location.trim();
            andConditions.push({
                OR: [
                    { location: { contains: locationTerm, mode: 'insensitive' } },
                    { cooperative: { district: { contains: locationTerm, mode: 'insensitive' } } },
                ],
            });
        }

        if (inStock === 'true' || inStock === '1') {
            andConditions.push({ availableStock: { gt: 0 } });
        }

        if (search && search.trim()) {
            const searchTerm = search.trim();
            andConditions.push({
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { description: { contains: searchTerm, mode: 'insensitive' } },
                    { category: { contains: searchTerm, mode: 'insensitive' } },
                    { cooperative: { name: { contains: searchTerm, mode: 'insensitive' } } },
                ],
            });
        }

        const where: Prisma.ProductWhereInput =
            andConditions.length > 1 ? { AND: andConditions } : andConditions[0] || {};

        const skip = Math.max(0, (Number(page) - 1) * Number(limit));
        const take = Math.max(1, Math.min(Number(limit), 100));

        let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
        switch (sortBy) {
            case 'price-low':
                orderBy = { price: 'asc' };
                break;
            case 'price-high':
                orderBy = { price: 'desc' };
                break;
            case 'name':
                orderBy = { name: 'asc' };
                break;
            case 'recent':
            default:
                orderBy = { createdAt: 'desc' };
        }

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    cooperative: {
                        select: {
                            id: true,
                            name: true,
                            logo: true,
                            email: true,
                            phone: true,
                            address: true,
                            district: true,
                        },
                    },
                    _count: {
                        select: { reviews: true },
                    },
                },
            }),
            this.prisma.product.count({ where }),
        ]);

        const normalizedProducts = products.map((product) => ({
            ...product,
            averageRating: product.averageRating ?? 0,
            reviewCount: product.reviewCount ?? product._count?.reviews ?? 0,
        }));

        return {
            products: normalizedProducts,
            pagination: {
                page: Number(page),
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                cooperative: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        email: true,
                        phone: true,
                        address: true,
                        district: true,
                    },
                },
                _count: {
                    select: { reviews: true },
                },
            },
        });

        if (!product || !product.isActive) {
            throw new NotFoundException('Product not found');
        }

        const ratingStats = await this.prisma.review.aggregate({
            where: { productId: id },
            _avg: { rating: true },
            _count: { rating: true },
        });

        return {
            ...product,
            averageRating: ratingStats._avg.rating || 0,
            reviewCount: ratingStats._count.rating || 0,
        };
    }

    async update(id: string, updateProductDto: UpdateProductDto, user: any, files?: any[]) {
        if (!user.cooperativeId) {
            throw new ForbiddenException('Not authorized');
        }

        const existingProduct = await this.prisma.product.findUnique({ where: { id } });

        if (!existingProduct) {
            throw new NotFoundException('Product not found');
        }

        if (existingProduct.cooperativeId !== user.cooperativeId) {
            throw new ForbiddenException('Not authorized to update this product');
        }

        const updateData: any = { ...updateProductDto };

        // Handle image updates
        if (files && files.length > 0) {
            const newImages = await this.uploadService.uploadMultipleImages(files, 'products');
            updateData.images = [...existingProduct.images, ...newImages];
        }

        // Type conversions
        if (updateData.price) updateData.price = Number(updateData.price);
        if (updateData.availableStock) updateData.availableStock = Number(updateData.availableStock);
        if (updateData.shippingCost) updateData.shippingCost = Number(updateData.shippingCost);

        const product = await this.prisma.product.update({
            where: { id },
            data: updateData,
        });

        await this.prisma.activityLog.create({
            data: {
                userId: user.id,
                cooperativeId: user.cooperativeId,
                action: 'PRODUCT_UPDATED',
                entity: 'PRODUCT',
                entityId: id,
            },
        });

        return product;
    }

    async remove(id: string, user: any) {
        if (!user.cooperativeId) {
            throw new ForbiddenException('Not authorized');
        }

        const product = await this.prisma.product.findUnique({ where: { id } });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (product.cooperativeId !== user.cooperativeId) {
            throw new ForbiddenException('Not authorized to delete this product');
        }

        await this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });

        await this.prisma.activityLog.create({
            data: {
                userId: user.id,
                cooperativeId: user.cooperativeId,
                action: 'PRODUCT_DELETED',
                entity: 'PRODUCT',
                entityId: id,
            },
        });

        return { message: 'Product deleted successfully' };
    }

    async updateStock(id: string, stock: number, user: any) {
        if (!user.cooperativeId) {
            throw new ForbiddenException('Not authorized');
        }

        const product = await this.prisma.product.findUnique({ where: { id } });

        if (!product) throw new NotFoundException('Product not found');
        if (product.cooperativeId !== user.cooperativeId) throw new ForbiddenException('Not authorized');

        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data: { availableStock: Number(stock) },
        });

        return updatedProduct;
    }

    async getCategories() {
        const categories = await this.prisma.product.findMany({
            where: { isActive: true },
            select: { category: true },
            distinct: ['category'],
        });

        return categories.map((c) => c.category);
    }
}
