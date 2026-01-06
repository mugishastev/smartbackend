import { Module } from '@nestjs/common';
import { JobApplicationService } from './job-applications.service';
import { JobApplicationsController } from './job-applications.controller';

@Module({
    controllers: [JobApplicationsController],
    providers: [JobApplicationService],
    exports: [JobApplicationService],
})
export class JobApplicationsModule { }
