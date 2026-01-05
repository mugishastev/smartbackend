import { CooperativeStatus, UserRole } from '../lib/enums';
import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';

export const findCooperativesByStatus = async (status?: string) => {
  if (!status) {
    throw new ApiError(400, 'Status is required');
  }

  const cooperatives = await prisma.cooperative.findMany({
    where: {
      status: status as CooperativeStatus,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });
  return cooperatives;
};

export const findAllCooperatives = async (search?: string, status?: string) => {
  const where: any = {};

  if (status) {
    where.status = status as CooperativeStatus;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const cooperatives = await prisma.cooperative.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });
  return cooperatives;
};

export const manageCooperativeStatus = async (
  cooperativeId: string,
  status: CooperativeStatus,
  remarks?: string
) => {
  const cooperative = await prisma.cooperative.findUnique({
    where: { id: cooperativeId },
  });

  if (!cooperative) {
    throw new ApiError(404, 'Cooperative not found');
  }

  const updatedCooperative = await prisma.cooperative.update({
    where: { id: cooperativeId },
    data: {
      status,
    },
  });

  // Log this action for audit purposes
  // Assuming the action is initiated by a SUPER_ADMIN, though the user should be passed in
  await prisma.activityLog.create({
    data: {
      action: `COOPERATIVE_STATUS_CHANGED_TO_${status}`,
      entity: 'COOPERATIVE',
      entityId: cooperativeId,
      userId: 'system', // Placeholder for actual admin user ID
      details: {
        remarks: remarks || 'No remarks provided.',
        previousStatus: cooperative.status,
      },
    },
  });

  return updatedCooperative;
};

export const getDashboardAnalytics = async () => {
  const [
    totalCooperatives,
    cooperativesByStatus,
    totalUsers,
    totalMembers,
    usersByRole,
    totalProducts,
    totalOrders,
    totalTransactions,
    transactionVolume,
    cooperativesByRegion,
    monthlyRevenue,
  ] = await prisma.$transaction([
    prisma.cooperative.count(),
    prisma.cooperative.groupBy({
      by: ['status'],
      orderBy: {
        status: 'asc',
      },
      _count: {
        status: true,
      },
    }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        cooperativeId: { not: null },
      },
    }),
    prisma.user.groupBy({
      by: ['role'],
      orderBy: {
        role: 'asc',
      },
      _count: {
        role: true,
      },
    }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.transaction.count(),
    prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        type: { in: ['INCOME', 'CONTRIBUTION'] },
      },
    }),
    prisma.cooperative.groupBy({
      by: ['district'],
      orderBy: {
        district: 'asc',
      },
      _count: {
        district: true,
      },
    }),
    // Get monthly revenue data for the last 6 months
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as amount
      FROM "Transaction"
      WHERE "type" IN ('INCOME', 'CONTRIBUTION')
        AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `,
  ]);

  // Map districts to regions (Rwanda administrative regions)
  const regionMapping: { [key: string]: string } = {
    'Gasabo': 'Kigali',
    'Kicukiro': 'Kigali',
    'Nyarugenge': 'Kigali',
    'Burera': 'Northern',
    'Gakenke': 'Northern',
    'Gicumbi': 'Northern',
    'Musanze': 'Northern',
    'Rulindo': 'Northern',
    'Gisagara': 'Southern',
    'Huye': 'Southern',
    'Kamonyi': 'Southern',
    'Muhanga': 'Southern',
    'Nyamagabe': 'Southern',
    'Nyanza': 'Southern',
    'Nyaruguru': 'Southern',
    'Ruhango': 'Southern',
    'Bugesera': 'Eastern',
    'Gatsibo': 'Eastern',
    'Kayonza': 'Eastern',
    'Kirehe': 'Eastern',
    'Ngoma': 'Eastern',
    'Nyagatare': 'Eastern',
    'Rwamagana': 'Eastern',
    'Karongi': 'Western',
    'Ngororero': 'Western',
    'Nyabihu': 'Western',
    'Nyamasheke': 'Western',
    'Rubavu': 'Western',
    'Rusizi': 'Western',
    'Rutsiro': 'Western',
  };

  const cooperativesByRegionData = cooperativesByRegion.reduce((acc: { [key: string]: number }, group: any) => {
    const district = group.district as string;
    const region = regionMapping[district] || 'Other';
    if (!acc[region]) {
      acc[region] = 0;
    }
    const count = (group._count as any)?.district;
    acc[region] += typeof count === 'bigint' ? Number(count) : (count || 0);
    return acc;
  }, {} as { [key: string]: number });

  // Ensure all regions are represented (even with 0 count)
  const allRegions = ['Kigali', 'Northern', 'Southern', 'Eastern', 'Western', 'Other'];
  const cooperativesByRegionFinal = allRegions.map(region => ({
    region,
    count: cooperativesByRegionData[region] || 0,
  }));

  // Process monthly revenue data
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const monthlyRevenueData = [];

  // Generate last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = monthNames[date.getMonth()];

    // Find matching data from query result
    const matchingData = (monthlyRevenue as any[]).find((item: any) => {
      const itemDate = new Date(item.month);
      return `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
    });

    let amount = 0;
    if (matchingData) {
      const rawAmount = matchingData.amount;
      if (typeof rawAmount === 'bigint') {
        amount = Number(rawAmount);
      } else {
        amount = parseFloat(rawAmount) || 0;
      }
    }

    monthlyRevenueData.push({
      month: monthName,
      amount,
    });
  }

  // Convert BigInt values to Numbers for JSON serialization
  const totalTransactionVolumeValue = transactionVolume._sum?.amount 
    ? (typeof transactionVolume._sum.amount === 'bigint' 
        ? Number(transactionVolume._sum.amount) 
        : transactionVolume._sum.amount) 
    : 0;

  const analytics = {
    totalCooperatives,
    cooperativesByStatus: cooperativesByStatus.reduce((acc: { [key in CooperativeStatus]: number }, group: any) => {
      if (typeof group._count === 'object' && group._count !== null) {
        const count = group._count.status;
        const status = group.status as CooperativeStatus;
        if (status && Object.values(CooperativeStatus).includes(status)) {
          acc[status] = typeof count === 'bigint' ? Number(count) : (count || 0);
        }
      }
      return acc;
    }, {} as { [key in CooperativeStatus]: number }),
    totalUsers,
    totalMembers,
    usersByRole: usersByRole.reduce((acc: { [key: string]: number }, group: any) => {
      if (typeof group._count === 'object' && group._count !== null) {
        const count = group._count.role;
        acc[group.role] = typeof count === 'bigint' ? Number(count) : (count || 0);
      }
      return acc;
    }, {} as { [key in UserRole]: number }),
    totalProducts,
    totalOrders,
    totalTransactions,
    totalTransactionVolume: totalTransactionVolumeValue,
    cooperativesByRegion: cooperativesByRegionFinal,
    monthlyRevenue: monthlyRevenueData.map(item => ({
      ...item,
      amount: typeof item.amount === 'bigint' ? Number(item.amount) : item.amount
    })),
  };

  return analytics;
};

// Admin Report Generation Functions
export const generatePlatformFinancialReport = async (period: string, generatedBy: string) => {
  // Parse period - can be YYYY-MM, YYYY-Q1, or YYYY
  let startDate: Date;
  let endDate: Date;

  if (period.includes('Q')) {
    // Quarterly: YYYY-Q1, YYYY-Q2, etc.
    const [year, quarter] = period.split('-Q');
    const quarterNum = parseInt(quarter);
    startDate = new Date(parseInt(year), (quarterNum - 1) * 3, 1);
    endDate = new Date(parseInt(year), quarterNum * 3, 0);
  } else if (period.length === 4) {
    // Annual: YYYY
    startDate = new Date(`${period}-01-01`);
    endDate = new Date(`${period}-12-31`);
  } else {
    // Monthly: YYYY-MM
    startDate = new Date(`${period}-01`);
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  }

  // Get all transactions for the period
  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      cooperative: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Calculate platform-wide financial metrics
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

  // Group by cooperative
  const cooperativeStats = transactions.reduce((acc: any, t) => {
    const coopId = t.cooperativeId || 'none';
    if (!acc[coopId]) {
      acc[coopId] = {
        cooperativeId: coopId,
        cooperativeName: t.cooperative?.name || 'N/A',
        income: 0,
        expenses: 0,
        netProfit: 0,
        transactionCount: 0,
      };
    }
    if (t.type === 'INCOME' || t.type === 'CONTRIBUTION') {
      acc[coopId].income += Number(t.amount);
    }
    if (t.type === 'EXPENSE') {
      acc[coopId].expenses += Number(t.amount);
    }
    acc[coopId].transactionCount += 1;
    acc[coopId].netProfit = acc[coopId].income - acc[coopId].expenses;
    return acc;
  }, {});

  const reportData = {
    period,
    platformMetrics: {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses,
      totalLoans: loans,
      totalLoanRepayments: loanRepayments,
      totalTransactions: transactions.length,
    },
    cooperativeBreakdown: Object.values(cooperativeStats),
    generatedAt: new Date().toISOString(),
  };

  return reportData;
};

export const generatePlatformUserReport = async (period: string, generatedBy: string) => {
  // Parse period
  let startDate: Date;
  let endDate: Date;

  if (period.includes('Q')) {
    const [year, quarter] = period.split('-Q');
    const quarterNum = parseInt(quarter);
    startDate = new Date(parseInt(year), (quarterNum - 1) * 3, 1);
    endDate = new Date(parseInt(year), quarterNum * 3, 0);
  } else if (period.length === 4) {
    startDate = new Date(`${period}-01-01`);
    endDate = new Date(`${period}-12-31`);
  } else {
    startDate = new Date(`${period}-01`);
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  }

  // Get all users
  const [allUsers, newUsers, usersByRole, usersByCooperative] = await Promise.all([
    prisma.user.findMany({
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    }),
    prisma.user.groupBy({
      by: ['cooperativeId'],
      _count: {
        cooperativeId: true,
      },
    }),
  ]);

  const reportData = {
    period,
    platformMetrics: {
      totalUsers: allUsers.length,
      newUsersInPeriod: newUsers.length,
      activeUsers: allUsers.filter((u) => u.isActive).length,
      usersByRole: usersByRole.reduce((acc: any, group: any) => {
        acc[group.role] = typeof group._count.role === 'bigint' 
          ? Number(group._count.role) 
          : group._count.role;
        return acc;
      }, {}),
    },
    userGrowth: {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      newRegistrations: newUsers.length,
    },
    generatedAt: new Date().toISOString(),
  };

  return reportData;
};

export const generatePlatformCooperativeReport = async (period: string, generatedBy: string) => {
  // Parse period
  let startDate: Date;
  let endDate: Date;

  if (period.includes('Q')) {
    const [year, quarter] = period.split('-Q');
    const quarterNum = parseInt(quarter);
    startDate = new Date(parseInt(year), (quarterNum - 1) * 3, 1);
    endDate = new Date(parseInt(year), quarterNum * 3, 0);
  } else if (period.length === 4) {
    startDate = new Date(`${period}-01-01`);
    endDate = new Date(`${period}-12-31`);
  } else {
    startDate = new Date(`${period}-01`);
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  }

  const [allCooperatives, newCooperatives, cooperativesByStatus, cooperativesByRegion] = await Promise.all([
    prisma.cooperative.findMany({
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
          },
        },
      },
    }),
    prisma.cooperative.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.cooperative.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    }),
    prisma.cooperative.groupBy({
      by: ['district'],
      _count: {
        district: true,
      },
    }),
  ]);

  const reportData = {
    period,
    platformMetrics: {
      totalCooperatives: allCooperatives.length,
      newCooperativesInPeriod: newCooperatives.length,
      cooperativesByStatus: cooperativesByStatus.reduce((acc: any, group: any) => {
        acc[group.status] = typeof group._count.status === 'bigint'
          ? Number(group._count.status)
          : group._count.status;
        return acc;
      }, {}),
      averageMembersPerCooperative: allCooperatives.length > 0
        ? allCooperatives.reduce((sum, c) => sum + (c._count?.users || 0), 0) / allCooperatives.length
        : 0,
    },
    cooperativeDetails: allCooperatives.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      registrationNumber: c.registrationNumber,
      totalMembers: c._count?.users || 0,
      totalProducts: c._count?.products || 0,
      totalTransactions: c._count?.transactions || 0,
    })),
    generatedAt: new Date().toISOString(),
  };

  return reportData;
};

export const generatePlatformPerformanceReport = async (period: string, generatedBy: string) => {
  // Parse period
  let startDate: Date;
  let endDate: Date;

  if (period.includes('Q')) {
    const [year, quarter] = period.split('-Q');
    const quarterNum = parseInt(quarter);
    startDate = new Date(parseInt(year), (quarterNum - 1) * 3, 1);
    endDate = new Date(parseInt(year), quarterNum * 3, 0);
  } else if (period.length === 4) {
    startDate = new Date(`${period}-01-01`);
    endDate = new Date(`${period}-12-31`);
  } else {
    startDate = new Date(`${period}-01`);
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  }

  // Get analytics data
  const analytics = await getDashboardAnalytics();

  // Get activity logs for the period
  const activities = await prisma.activityLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    take: 100,
    orderBy: {
      createdAt: 'desc',
    },
  });

  const reportData = {
    period,
    platformPerformance: {
      totalCooperatives: analytics.totalCooperatives,
      totalUsers: analytics.totalUsers,
      totalTransactions: analytics.totalTransactions,
      totalTransactionVolume: analytics.totalTransactionVolume,
      totalProducts: analytics.totalProducts,
      totalOrders: analytics.totalOrders,
    },
    growthMetrics: {
      cooperativesByStatus: analytics.cooperativesByStatus,
      usersByRole: analytics.usersByRole,
      cooperativesByRegion: analytics.cooperativesByRegion,
    },
    activitySummary: {
      totalActivities: activities.length,
      recentActivities: activities.slice(0, 20).map((a) => ({
        action: a.action,
        entity: a.entity,
        timestamp: a.createdAt,
      })),
    },
    generatedAt: new Date().toISOString(),
  };

  return reportData;
};
