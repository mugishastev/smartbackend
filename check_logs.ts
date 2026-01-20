import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.activityLog.findMany({
        where: {
            action: { in: ['PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED'] }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
    });
    console.log('Recent Product Activity Logs:', JSON.stringify(logs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
