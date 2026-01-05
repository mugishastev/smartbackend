import dotenv from 'dotenv';
import { Secret } from 'jsonwebtoken';

dotenv.config();

export const config: {
  port: string | number;
  nodeEnv: string;
  jwt: { secret: Secret; expiresIn: string };
  email: any;
  cloudinary: any;
  paypack: any;
  frontend: any;
  otp: any;
  notifications: {
    smsProviderUrl: string;
    smsApiKey: string;
  };
} = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'production',
  
  jwt: {
    secret: (process.env.JWT_SECRET || 'your-secret-key') as Secret,
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },
  
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'Smart Coop Hub <noreply@smartcoophub.rw>',
  },
  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  
  paypack: {
    apiUrl: process.env.PAYPACK_API_URL || 'https://payments.paypack.rw/api',
    clientId: process.env.PAYPACK_CLIENT_ID || '',
    clientSecret: process.env.PAYPACK_CLIENT_SECRET || '',
    webhookSecret: process.env.PAYPACK_WEBHOOK_SECRET || '',
  },
  
  frontend: {
    // Normalize URL by removing trailing slash
    url: (process.env.FRONTEND_URL || 'https://smart-cooperative-hub.onrender.com').replace(/\/+$/, ''),
  },
  notifications: {
    smsProviderUrl: process.env.SMS_PROVIDER_URL || '',
    smsApiKey: process.env.SMS_API_KEY || '',
  },
  
  
  
  
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
  },
};