import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminSettingsController } from './admin-settings.controller';

@Module({
    controllers: [AdminController, AdminSettingsController],
    providers: [AdminService, AdminSettingsService],
    exports: [AdminService, AdminSettingsService],
})
export class AdminModule { }
