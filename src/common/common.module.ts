import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from './services/upload.service';
import { EmailService } from './services/email.service';
import { CSVService } from './services/csv.service';
import { LocalizationService } from './services/localization.service';
import { OTPService } from './services/otp.service';
import { BlockchainService } from './services/blockchain.service';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [
        UploadService,
        EmailService,
        CSVService,
        LocalizationService,
        OTPService,
        BlockchainService,
    ],
    exports: [
        UploadService,
        EmailService,
        CSVService,
        LocalizationService,
        OTPService,
        BlockchainService,
    ],
})
export class CommonModule { }


