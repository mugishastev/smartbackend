import { PrismaClient, UserRole, CooperativeStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('Password123!', 10);

    // 1. Create Super Admin
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@example.com' },
        update: {},
        create: {
            email: 'superadmin@example.com',
            password,
            firstName: 'Super',
            lastName: 'Admin',
            phone: '0780000000',
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            emailVerified: true,
        },
    });
    console.log('Super Admin created:', superAdmin.email);

    // 2. Create Test Cooperative
    const cooperative = await prisma.cooperative.upsert({
        where: { email: 'coop@example.com' }, // Assuming email is unique for cooperative
        update: {},
        create: {
            name: 'Test Cooperative',
            email: 'coop@example.com', // Must align with schema constraints
            phone: '0780000001',
            registrationNumber: 'RCA/0001/2024',
            status: CooperativeStatus.APPROVED,
            district: 'Gasabo',
            sector: 'Kacyiru',
            address: 'KG 7 Ave',
            type: 'AGRICULTURE',
            cell: 'Kamatamu',
            village: 'Isangano',
        },
    });
    // Note: if cooperative email is not unique in schema, might need to find by name or other field.
    // Assuming email is unique or we are creating new.
    console.log('Test Cooperative created:', cooperative.name);

    // 3. Create Cooperative Admin
    const coopAdmin = await prisma.user.upsert({
        where: { email: 'coopadmin@example.com' },
        update: { cooperativeId: cooperative.id },
        create: {
            email: 'coopadmin@example.com',
            password,
            firstName: 'Coop',
            lastName: 'Admin',
            phone: '0780000002',
            role: UserRole.COOP_ADMIN,
            isActive: true,
            emailVerified: true,
            cooperativeId: cooperative.id,
        },
    });
    console.log('Coop Admin created:', coopAdmin.email);

    // 4. Create Member
    const member = await prisma.user.upsert({
        where: { email: 'member@example.com' },
        update: { cooperativeId: cooperative.id },
        create: {
            email: 'member@example.com',
            password,
            firstName: 'John',
            lastName: 'Member',
            phone: '0780000003',
            role: UserRole.MEMBER,
            isActive: true,
            emailVerified: true,
            cooperativeId: cooperative.id,
        },
    });
    console.log('Member created:', member.email);

    // 5. Create Buyer (for Marketplace verification)
    const buyer = await prisma.user.upsert({
        where: { email: 'buyer@example.com' },
        update: {},
        create: {
            email: 'buyer@example.com',
            password,
            firstName: 'Jane',
            lastName: 'Buyer',
            phone: '0780000004',
            role: UserRole.BUYER,
            isActive: true,
            emailVerified: true,
        },
    });
    console.log('Buyer created:', buyer.email);
}

main()
    .catch((e) => {
        console.error(e);
        // process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
