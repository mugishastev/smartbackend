import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.product.count();
    console.log(`Total products: ${count}`);
    const recent = await prisma.product.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { name: true, createdAt: true }
    });
    console.log('Recent products:', recent);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
