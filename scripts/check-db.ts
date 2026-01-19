import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        console.log('🔍 Checking database...\n');

        // Check cooperatives
        const cooperatives = await prisma.cooperative.findMany({
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });
        console.log(`📊 Total Cooperatives: ${cooperatives.length}`);
        if (cooperatives.length > 0) {
            console.log('\nCooperatives:');
            cooperatives.forEach((coop) => {
                console.log(`  - ${coop.name} (${coop.status}) - ${coop._count.users} users`);
            });
        }

        // Check users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
            },
        });
        console.log(`\n👥 Total Users: ${users.length}`);
        if (users.length > 0) {
            console.log('\nUsers by role:');
            const usersByRole = users.reduce((acc, user) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            Object.entries(usersByRole).forEach(([role, count]) => {
                console.log(`  - ${role}: ${count}`);
            });
        }

        // Check for super admin
        const superAdmins = users.filter((u) => u.role === 'SUPER_ADMIN');
        console.log(`\n🔐 Super Admins: ${superAdmins.length}`);
        if (superAdmins.length > 0) {
            superAdmins.forEach((admin) => {
                console.log(`  - ${admin.email} (${admin.firstName} ${admin.lastName})`);
            });
        }

        console.log('\n✅ Database check complete!');
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
