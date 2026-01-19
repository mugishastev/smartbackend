import { Injectable } from '@nestjs/common';
import { CooperativeStatus, UserRole } from '../lib/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  async findCooperativesByStatus(status?: string) {
    if (!status) {
      throw new ApiError(400, 'Status is required');
    }

    const cooperatives = await this.prisma.cooperative.findMany({
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
  }

  async findAllCooperatives(search?: string, status?: string) {
    console.log('[AdminService.findAllCooperatives] Called with params:', { search, status });

    const where: any = {};

    if (status) {
      where.status = status as CooperativeStatus;
      console.log('[AdminService.findAllCooperatives] Filtering by status:', status);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
      console.log('[AdminService.findAllCooperatives] Filtering by search:', search);
    }

    console.log('[AdminService.findAllCooperatives] Where clause:', JSON.stringify(where, null, 2));

    const cooperatives = await this.prisma.cooperative.findMany({
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

    console.log(`[AdminService.findAllCooperatives] Found ${cooperatives.length} cooperatives`);
    if (cooperatives.length > 0) {
      console.log('[AdminService.findAllCooperatives] Statuses:', cooperatives.map(c => c.status).join(', '));
      console.log('[AdminService.findAllCooperatives] First cooperative:', {
        id: cooperatives[0].id,
        name: cooperatives[0].name,
        status: cooperatives[0].status,
        email: cooperatives[0].email
      });
    } else {
      console.log('[AdminService.findAllCooperatives] No cooperatives found with current filters');
      // Let's check if there are ANY cooperatives in the database
      const totalCoops = await this.prisma.cooperative.count();
      console.log('[AdminService.findAllCooperatives] Total cooperatives in database:', totalCoops);
      if (totalCoops > 0) {
        const allStatuses = await this.prisma.cooperative.groupBy({
          by: ['status'],
          _count: { status: true }
        });
        console.log('[AdminService.findAllCooperatives] Cooperatives by status:', allStatuses);
      }
    }

    return cooperatives;
  }

  async findAllUsers(search?: string, role?: string, page: number = 1, limit: number = 20) {
    const where: any = {};

    if (role && role !== 'ALL') {
      where.role = role as UserRole;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          cooperative: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async manageCooperativeStatus(
    cooperativeId: string,
    status: CooperativeStatus,
    remarks?: string
  ) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: { id: cooperativeId },
    });

    if (!cooperative) {
      throw new ApiError(404, 'Cooperative not found');
    }

    const updatedCooperative = await this.prisma.cooperative.update({
      where: { id: cooperativeId },
      data: {
        status,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        action: `COOPERATIVE_STATUS_CHANGED_TO_${status}`,
        entity: 'COOPERATIVE',
        entityId: cooperativeId,
        userId: 'system',
        details: {
          remarks: remarks || 'No remarks provided.',
          previousStatus: cooperative.status,
        },
      },
    });

    return updatedCooperative;
  }

  async getDashboardAnalytics() {
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
    ] = await this.prisma.$transaction([
      this.prisma.cooperative.count(),
      this.prisma.cooperative.groupBy({
        by: ['status'],
        orderBy: {
          status: 'asc',
        },
        _count: {
          status: true,
        },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          cooperativeId: { not: null },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        orderBy: {
          role: 'asc',
        },
        _count: {
          role: true,
        },
      }),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: { in: ['INCOME', 'CONTRIBUTION'] },
        },
      }),
      this.prisma.cooperative.groupBy({
        by: ['district'],
        orderBy: {
          district: 'asc',
        },
        _count: {
          district: true,
        },
      }),
      this.prisma.$queryRaw`
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

    const cooperativesByRegionData = (Array.isArray(cooperativesByRegion) ? cooperativesByRegion : [] as any[]).reduce((acc: { [key: string]: number }, group: any) => {
      const district = group.district as string;
      const region = regionMapping[district] || 'Other';
      if (!acc[region]) {
        acc[region] = 0;
      }
      const count = (group._count as any)?.district;
      acc[region] += typeof count === 'bigint' ? Number(count) : (count || 0);
      return acc;
    }, {} as { [key: string]: number });

    const allRegions = ['Kigali', 'Northern', 'Southern', 'Eastern', 'Western', 'Other'];
    const cooperativesByRegionFinal = allRegions.map(region => ({
      region,
      count: cooperativesByRegionData[region] || 0,
    }));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const monthlyRevenueData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = monthNames[date.getMonth()];

      const matchingData = (Array.isArray(monthlyRevenue) ? monthlyRevenue : [] as any[]).find((item: any) => {
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

    const totalTransactionVolumeValue = transactionVolume._sum?.amount
      ? (typeof transactionVolume._sum.amount === 'bigint'
        ? Number(transactionVolume._sum.amount)
        : transactionVolume._sum.amount)
      : 0;

    const analytics = {
      totalCooperatives,
      cooperativesByStatus: (Array.isArray(cooperativesByStatus) ? cooperativesByStatus : []).reduce((acc: { [key in CooperativeStatus]: number }, group: any) => {
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

    const pendingGroup = (Array.isArray(cooperativesByStatus) ? cooperativesByStatus : []).find((g: any) => g.status === 'PENDING');
    const pendingCount = pendingGroup && typeof pendingGroup._count === 'object' && pendingGroup._count !== null
      ? (typeof pendingGroup._count.status === 'bigint' ? Number(pendingGroup._count.status) : (pendingGroup._count.status || 0))
      : 0;

    console.log('[AdminService.getDashboardAnalytics] Stats:', JSON.stringify({
      totalCooperatives,
      pendingCooperatives: pendingCount
    }));

    return analytics;
  }

  async generatePlatformFinancialReport(period: string, generatedBy: string) {
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

    const transactions = await this.prisma.transaction.findMany({
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

    const cooperativeStats = transactions.reduce((acc: any, t) => {
      const coopId = t.cooperativeId;
      if (!acc[coopId]) {
        acc[coopId] = {
          cooperativeId: coopId,
          cooperativeName: t.cooperative?.name,
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
  }

  async generatePlatformUserReport(period: string, generatedBy: string) {
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

    const [allUsers, newUsers, usersByRole, usersByCooperative] = await Promise.all([
      this.prisma.user.findMany({
        include: {
          cooperative: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      }),
      this.prisma.user.groupBy({
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
  }

  async generatePlatformCooperativeReport(period: string, generatedBy: string) {
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
      this.prisma.cooperative.findMany({
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
      this.prisma.cooperative.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.cooperative.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
      this.prisma.cooperative.groupBy({
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
  }

  async generatePlatformPerformanceReport(period: string, generatedBy: string) {
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

    const analytics = await this.getDashboardAnalytics();

    const activities = await this.prisma.activityLog.findMany({
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
  }

  async getRecentActivities(limit?: number) {
    const activities = await this.prisma.activityLog.findMany({
      take: limit || 50,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return activities;
  }

  async getSystemHealth() {
    // Get server uptime
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeFormatted = `${uptimeHours}h ${uptimeMinutes}m`;

    // Check database connection
    let databaseStatus = 'connected';
    let activeConnections = 0;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      // Get active connections count (PostgreSQL specific)
      const result: any = await this.prisma.$queryRaw`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      activeConnections = parseInt(result[0]?.count || '0');
    } catch (error) {
      databaseStatus = 'disconnected';
    }

    // Get security metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const [failedLogins, activeSessions] = await Promise.all([
      this.prisma.activityLog.count({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: {
            gte: oneDayAgo,
          },
        },
      }),
      this.prisma.activityLog.count({
        where: {
          action: 'LOGIN_SUCCESS',
          createdAt: {
            gte: thirtyMinutesAgo,
          },
        },
      }),
    ]);

    // Get recent alerts (critical activities)
    const alerts = await this.prisma.activityLog.findMany({
      where: {
        action: {
          in: ['COOPERATIVE_SUSPENDED', 'USER_DEACTIVATED', 'SECURITY_ALERT'],
        },
        createdAt: {
          gte: oneDayAgo,
        },
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      server: {
        status: 'healthy',
        uptime: uptimeFormatted,
      },
      database: {
        status: databaseStatus,
        connections: activeConnections,
      },
      security: {
        failedLogins,
        activeSessions,
      },
      alerts: alerts.map(a => ({
        action: a.action,
        entity: a.entity,
        createdAt: a.createdAt,
        details: a.details,
      })),
    };
  }

  async getCooperativeById(id: string) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
          },
        },
      },
    });

    if (!cooperative) {
      throw new ApiError(404, 'Cooperative not found');
    }

    return {
      message: 'Cooperative retrieved successfully',
      cooperative,
    };
  }
}

