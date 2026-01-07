import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        take: 5,
        select: { email: true, firstName: true, role: true }
    });
    console.log('Recent Users:', JSON.stringify(users, null, 2));

    const userCount = await prisma.user.count();
    console.log('Total Users:', userCount);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
