import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';
import { blockchainService } from '../common/services/blockchain.service';
import { Report, Transaction, User, MemberFinancial } from '@prisma/client';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createReportDto: any) {
        return this.prisma.report.create({
            data: createReportDto
        });
    }

    async generateFinancialReport(
        cooperativeId: string,
        period: string,
        generatedBy: string
    ) {
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id: cooperativeId },
        });

        if (!cooperative) {
            throw new ApiError(404, 'Cooperative not found');
        }

        const startDate = new Date(`${period}-01`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                cooperativeId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const income = transactions
            .filter((t) => t.type === 'INCOME' || t.type === 'CONTRIBUTION')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = transactions
            .filter((t) => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const loans = transactions
            .filter((t) => t.type === 'LOAN')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const loanRepayments = transactions
            .filter((t) => t.type === 'LOAN_REPAYMENT')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const dividends = transactions
            .filter((t) => t.type === 'DIVIDEND')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const withdrawals = transactions
            .filter((t) => t.type === 'WITHDRAWAL')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const reportData = {
            period,
            totalIncome: income,
            totalExpenses: expenses,
            netProfit: income - expenses,
            totalLoans: loans,
            totalLoanRepayments: loanRepayments,
            totalDividends: dividends,
            totalWithdrawals: withdrawals,
            transactionCount: transactions.length,
        };

        return this.prisma.report.create({
            data: {
                cooperativeId,
                title: `Financial Report - ${period}`,
                type: 'FINANCIAL',
                period,
                content: reportData,
                generatedBy,
            },
        });
    }

    async findAll(cooperativeId: string) {
        return this.prisma.report.findMany({
            where: { cooperativeId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.report.findUnique({
            where: { id },
        });
    }
}
