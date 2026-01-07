import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.split(':')[0]);

    try {
        await prisma.$connect();
        console.log('Successfully connected to the database!');
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);
    } catch (error: any) {
        console.error('Failed to connect to the database:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
