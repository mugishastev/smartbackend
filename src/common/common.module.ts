import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from './services/upload.service';
import { EmailService } from './services/email.service';
import { CSVService } from './services/csv.service';
import { LocalizationService } from './services/localization.service';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [
        UploadService,
        EmailService,
        CSVService,
        LocalizationService,
    ],
    exports: [
        UploadService,
        EmailService,
        CSVService,
        LocalizationService,
    ],
})
export class CommonModule { }
