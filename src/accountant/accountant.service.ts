import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';

@Injectable()
export class AccountantService {
    constructor(private readonly prisma: PrismaService) { }

    async getDashboard(cooperativeId: string) {
        // Verify cooperative exists
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id: cooperativeId },
        });

        if (!cooperative) {
            throw new ApiError(404, 'Cooperative not found');
        }

        // Get current month start and end
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Get all transactions for the cooperative
        const [
            allTransactions,
            monthlyTransactions,
            memberFinancials,
            activeMembers,
        ] = await Promise.all([
            this.prisma.transaction.findMany({
                where: { cooperativeId },
            }),
            this.prisma.transaction.findMany({
                where: {
                    cooperativeId,
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
            }),
            this.prisma.memberFinancial.findMany({
                where: { cooperativeId },
            }),
            this.prisma.user.count({
                where: {
                    cooperativeId,
                    isActive: true,
                    role: { in: ['MEMBER', 'SECRETARY', 'ACCOUNTANT', 'COOP_ADMIN'] },
                },
            }),
        ]);

        // Calculate total balance (income - expenses)
        const totalIncome = allTransactions
            .filter(t => ['INCOME', 'CONTRIBUTION'].includes(t.type))
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpenses = allTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalBalance = totalIncome - totalExpenses;

        // Calculate monthly income and expenses
        const monthlyIncome = monthlyTransactions
            .filter(t => ['INCOME', 'CONTRIBUTION'].includes(t.type))
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Calculate total savings from member financials
        const totalSavings = memberFinancials.reduce(
            (sum, mf) => sum + Number(mf.savings),
            0
        );

        // Calculate average savings per member
        const averageSavings = activeMembers > 0 ? totalSavings / activeMembers : 0;

        // Calculate pending dividends
        const pendingDividends = memberFinancials.reduce(
            (sum, mf) => sum + Number(mf.dividends),
            0
        );

        return {
            stats: {
                totalBalance,
                monthlyIncome,
                monthlyExpenses,
                totalSavings,
                activeMembers,
                averageSavings,
                pendingDividends,
            },
        };
    }

    async getFinancialSummary(cooperativeId: string) {
        // Verify cooperative exists
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id: cooperativeId },
        });

        if (!cooperative) {
            throw new ApiError(404, 'Cooperative not found');
        }

        // Get all transactions
        const transactions = await this.prisma.transaction.findMany({
            where: { cooperativeId },
        });

        // Calculate totals
        const totalIncome = transactions
            .filter(t => ['INCOME', 'CONTRIBUTION'].includes(t.type))
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const netBalance = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            netBalance,
        };
    }

    async generateFinancialReport(
        cooperativeId: string,
        type: 'monthly' | 'quarterly' | 'annual'
    ) {
        // Verify cooperative exists
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id: cooperativeId },
        });

        if (!cooperative) {
            throw new ApiError(404, 'Cooperative not found');
        }

        // Calculate date range based on report type
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        switch (type) {
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarterly':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
                break;
            case 'annual':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }

        // Get transactions for the period
        const transactions = await this.prisma.transaction.findMany({
            where: {
                cooperativeId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Group transactions by type
        const income = transactions.filter(t =>
            ['INCOME', 'CONTRIBUTION'].includes(t.type)
        );
        const expenses = transactions.filter(t => t.type === 'EXPENSE');
        const loans = transactions.filter(t => t.type === 'LOAN');
        const loanRepayments = transactions.filter(t => t.type === 'LOAN_REPAYMENT');
        const dividends = transactions.filter(t => t.type === 'DIVIDEND');

        // Calculate totals
        const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalLoans = loans.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalLoanRepayments = loanRepayments.reduce(
            (sum, t) => sum + Number(t.amount),
            0
        );
        const totalDividends = dividends.reduce((sum, t) => sum + Number(t.amount), 0);

        // Get member financials
        const memberFinancials = await this.prisma.memberFinancial.findMany({
            where: { cooperativeId },
        });

        const report = {
            cooperative: {
                id: cooperative.id,
                name: cooperative.name,
                registrationNumber: cooperative.registrationNumber,
            },
            period: {
                type,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            summary: {
                totalIncome,
                totalExpenses,
                netProfit: totalIncome - totalExpenses,
                totalLoans,
                totalLoanRepayments,
                totalDividends,
                transactionCount: transactions.length,
            },
            memberSummary: {
                totalMembers: memberFinancials.length,
                totalSavings: memberFinancials.reduce(
                    (sum, mf) => sum + Number(mf.savings),
                    0
                ),
                totalShares: memberFinancials.reduce(
                    (sum, mf) => sum + Number(mf.shares),
                    0
                ),
                totalContributions: memberFinancials.reduce(
                    (sum, mf) => sum + Number(mf.contributions),
                    0
                ),
            },
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: Number(t.amount),
                description: t.description,
                category: t.category,
                reference: t.reference,
                user: t.user
                    ? `${t.user.firstName} ${t.user.lastName}`
                    : 'System',
                createdAt: t.createdAt,
            })),
            generatedAt: new Date().toISOString(),
        };

        return report;
    }
}
