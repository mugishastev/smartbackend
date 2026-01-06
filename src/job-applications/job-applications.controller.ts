import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { JobApplicationService } from './job-applications.service';

@Controller('job-applications')
export class JobApplicationsController {
    constructor(private readonly jobApplicationService: JobApplicationService) { }

    @Post()
    async createApplication(@Body() dto: any) {
        const { announcementId, ...applicationData } = dto;
        return this.jobApplicationService.createApplication(announcementId, applicationData);
    }

    @Get('announcement/:id')
    async getByAnnouncement(@Param('id') id: string, @Query('cooperativeId') cooperativeId?: string) {
        return this.jobApplicationService.getApplicationsByAnnouncement(id, cooperativeId);
    }

    @Get('cooperative/:id')
    async getByCooperative(@Param('id') id: string) {
        return this.jobApplicationService.getApplicationsByCooperative(id);
    }

    @Put(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string, @Body('cooperativeId') cooperativeId: string) {
        return this.jobApplicationService.updateApplicationStatus(id, status, cooperativeId);
    }

    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.jobApplicationService.getApplicationById(id);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Body('cooperativeId') cooperativeId: string) {
        return this.jobApplicationService.deleteApplication(id, cooperativeId);
    }
}
