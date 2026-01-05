import { Report, User, Transaction, MemberFinancial } from '../types/api';
import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';
import { blockchainService } from './blockchain.service';

export const generateFinancialReport = async (
  cooperativeId: string,
  period: string,
  generatedBy: string
) => {
  const cooperative = await prisma.cooperative.findUnique({
    where: { id: cooperativeId },
  });

  if (!cooperative) {
    throw new ApiError(404, 'Cooperative not found');
  }

  // Get transactions for the period
  const startDate = new Date(`${period}-01`);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      cooperativeId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Calculate financial metrics
  const income = transactions
    .filter((t: Transaction) => t.type === 'INCOME' || t.type === 'CONTRIBUTION')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter((t: Transaction) => t.type === 'EXPENSE')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);

  const loans = transactions
    .filter((t: Transaction) => t.type === 'LOAN')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);

  const loanRepayments = transactions
    .filter((t: Transaction) => t.type === 'LOAN_REPAYMENT')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);

  const dividends = transactions
    .filter((t: Transaction) => t.type === 'DIVIDEND')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);

  const withdrawals = transactions
    .filter((t: Transaction) => t.type === 'WITHDRAWAL')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);

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

  // Create the report
  const report = await prisma.report.create({
    data: {
      cooperativeId,
      title: `Financial Report - ${period}`,
      type: 'FINANCIAL',
      period,
      content: reportData,
      generatedBy,
    },
  });

  return report;
};

export const generateMemberReport = async (
  cooperativeId: string,
  period: string,
  generatedBy: string
) => {
  const cooperative = await prisma.cooperative.findUnique({
    where: { id: cooperativeId },
    include: {
      users: {
        where: {
          role: { in: ['MEMBER', 'SECRETARY', 'ACCOUNTANT'] },
        },
      },
    },
  });

  if (!cooperative) {
    throw new ApiError(404, 'Cooperative not found');
  }

  // Get member financial data
  const memberFinancials = await prisma.memberFinancial.findMany({
    where: { cooperativeId },
  });

  const totalMembers = cooperative.users.length;
  const totalShares = memberFinancials.reduce((sum: number, mf: MemberFinancial) => sum + Number(mf.shares), 0);
  const totalSavings = memberFinancials.reduce((sum: number, mf: MemberFinancial) => sum + Number(mf.savings), 0);
  const totalContributions = memberFinancials.reduce((sum: number, mf: MemberFinancial) => sum + Number(mf.contributions), 0);

  const reportData = {
    period,
    totalMembers,
    totalShares,
    totalSavings,
    totalContributions,
    averageSharesPerMember: totalMembers > 0 ? totalShares / totalMembers : 0,
    averageSavingsPerMember: totalMembers > 0 ? totalSavings / totalMembers : 0,
    memberDetails: cooperative.users.map((user: User) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      joinedAt: user.createdAt,
    })),
  };

  // Create the report
  const report = await prisma.report.create({
    data: {
      cooperativeId,
      title: `Member Report - ${period}`,
      type: 'PERFORMANCE',
      period,
      content: reportData,
      generatedBy,
    },
  });

  return report;
};

export const getReportsByCooperative = async (cooperativeId: string, type?: string) => {
  const where: any = { cooperativeId };
  if (type) {
    where.type = type;
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return reports;
};

export const getReportById = async (reportId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      cooperative: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  return report;
};

export const generateRCAComplianceReport = async (
  cooperativeId: string,
  period: string,
  generatedBy: string
) => {
  const cooperative = await prisma.cooperative.findUnique({
    where: { id: cooperativeId },
    include: {
      users: true,
      transactions: {
        where: {
          createdAt: {
            gte: new Date(`${period}-01-01`),
            lte: new Date(`${period}-12-31`),
          },
        },
      },
      reports: {
        where: {
          type: 'FINANCIAL',
          period: {
            startsWith: period,
          },
        },
      },
    },
  });

  if (!cooperative) {
    throw new ApiError(404, 'Cooperative not found');
  }

  // RCA Compliance Metrics
  const complianceData = {
    period,
    cooperativeInfo: {
      name: cooperative.name,
      registrationNumber: cooperative.registrationNumber,
      status: cooperative.status,
      foundedDate: cooperative.foundedDate,
      totalMembers: cooperative.totalMembers,
    },
    financialMetrics: {
      totalTransactions: cooperative.transactions.length,
      approvedTransactions: cooperative.transactions.filter((t: Transaction) => t.status === 'APPROVED').length,
      pendingApprovals: cooperative.transactions.filter((t: Transaction) => t.status === 'PENDING').length,
      blockchainLoggedTransactions: cooperative.transactions.filter((t: Transaction) => t.blockchainHash).length,
    },
    governanceMetrics: {
      totalUsers: cooperative.users.length,
      activeMembers: cooperative.users.filter((u: User) => u.isActive).length,
      roleDistribution: {
        members: cooperative.users.filter((u: User) => u.role === 'MEMBER').length,
        secretaries: cooperative.users.filter((u: User) => u.role === 'SECRETARY').length,
        accountants: cooperative.users.filter((u: User) => u.role === 'ACCOUNTANT').length,
        admins: cooperative.users.filter((u: User) => u.role === 'COOP_ADMIN').length,
      },
    },
    transparencyMetrics: {
      reportsGenerated: cooperative.reports.length,
      blockchainIntegration: process.env.BLOCKCHAIN_ENABLED === 'true',
      lastActivity: cooperative.updatedAt,
    },
    complianceStatus: {
      hasRequiredRoles: cooperative.users.some((u: User) => u.role === 'SECRETARY') &&
                       cooperative.users.some((u: User) => u.role === 'ACCOUNTANT'),
      hasActiveMembers: cooperative.users.filter((u: User) => u.role === 'MEMBER' && u.isActive).length > 0,
      hasRecentTransactions: cooperative.transactions.filter((t: Transaction) =>
        t.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      ).length > 0,
      hasBlockchainTransparency: cooperative.transactions.some((t: Transaction) => t.blockchainHash),
    },
  };

  // Generate blockchain hash for the report
  const reportHash = blockchainService.generateTransactionHash({
    cooperativeId,
    period,
    complianceData,
    generatedBy,
    timestamp: new Date().toISOString(),
  });

  // Log report to blockchain
  const blockchainLog = await blockchainService.logHash(reportHash);

  // Create the report
  const report = await prisma.report.create({
    data: {
      cooperativeId,
      title: `RCA Compliance Report - ${period}`,
      type: 'COMPLIANCE',
      period,
      content: {
        ...complianceData,
        blockchainHash: reportHash,
        blockchainTx: blockchainLog.transactionHash,
        blockNumber: blockchainLog.blockNumber,
      },
      generatedBy,
    },
  });

  return report;
};
