import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';

@Injectable()
export class JobApplicationService {
  constructor(private readonly prisma: PrismaService) { }

  async createApplication(
    announcementId: string,
    applicationData: {
      applicantName: string;
      applicantEmail: string;
      applicantPhone: string;
      resume?: string;
      coverLetter?: string;
    }
  ) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new ApiError(404, 'Announcement not found');
    }

    if (announcement.type !== 'JOB') {
      throw new ApiError(400, 'This announcement is not a job posting');
    }

    if (announcement.expiresAt && announcement.expiresAt < new Date()) {
      throw new ApiError(400, 'This job posting has expired');
    }

    const existingApplication = await this.prisma.jobApplication.findFirst({
      where: {
        announcementId,
        applicantEmail: applicationData.applicantEmail,
      },
    });

    if (existingApplication) {
      throw new ApiError(400, 'You have already applied for this job');
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        announcementId,
        ...applicationData,
      },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            cooperative: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (announcement.cooperativeId) {
      await this.prisma.activityLog.create({
        data: {
          userId: 'system',
          cooperativeId: announcement.cooperativeId,
          action: 'JOB_APPLICATION_RECEIVED',
          entity: 'JOB_APPLICATION',
          entityId: application.id,
          details: {
            announcementId,
            applicantEmail: applicationData.applicantEmail,
            applicantName: applicationData.applicantName,
          },
        },
      });
    }

    return application;
  }

  async getApplicationsByAnnouncement(announcementId: string, cooperativeId?: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new ApiError(404, 'Announcement not found');
    }

    if (cooperativeId && announcement.cooperativeId !== cooperativeId) {
      throw new ApiError(403, 'Not authorized to view applications for this announcement');
    }

    const applications = await this.prisma.jobApplication.findMany({
      where: { announcementId },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            cooperative: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return applications;
  }

  async getApplicationsByCooperative(cooperativeId: string) {
    const applications = await this.prisma.jobApplication.findMany({
      where: {
        announcement: {
          cooperativeId,
          type: 'JOB',
        },
      },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            type: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return applications;
  }

  async updateApplicationStatus(
    applicationId: string,
    status: string,
    cooperativeId: string
  ) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        announcement: true,
      },
    });

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (application.announcement.cooperativeId !== cooperativeId) {
      throw new ApiError(403, 'Not authorized to update this application');
    }

    const validStatuses = ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const updatedApplication = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            cooperative: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: 'system',
        cooperativeId,
        action: 'JOB_APPLICATION_STATUS_UPDATED',
        entity: 'JOB_APPLICATION',
        entityId: applicationId,
        details: { status, applicantEmail: application.applicantEmail },
      },
    });

    return updatedApplication;
  }

  async getApplicationById(applicationId: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            content: true,
            cooperative: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    return application;
  }

  async deleteApplication(applicationId: string, cooperativeId: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        announcement: true,
      },
    });

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (application.announcement.cooperativeId !== cooperativeId) {
      throw new ApiError(403, 'Not authorized to delete this application');
    }

    await this.prisma.jobApplication.delete({
      where: { id: applicationId },
    });

    return { message: 'Application deleted successfully' };
  }
}

