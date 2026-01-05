// src/config/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Cooperative Hub API',
      version: '1.0.0',
      description:
        'API documentation for the Smart Cooperative Hub, a platform for managing cooperatives in Rwanda.',
      contact: {
        name: 'API Support',
        email: 'support@coophub.rw',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development Server',
      },
      {
        url: `https://smart-cooperative-hub-be.onrender.com/api`,
        description: 'Production Server',
      },
    ],
    // This is crucial for enabling the "Authorize" button in Swagger UI
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'COOP_ADMIN', 'BUYER', 'MEMBER', 'SECRETARY', 'ACCOUNTANT'] },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Cooperative: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            registrationNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            district: { type: 'string' },
            sector: { type: 'string' },
            cell: { type: 'string' },
            village: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            foundedDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] },
            logo: { type: 'string' },
            certificate: { type: 'string' },
            constitution: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            unit: { type: 'string' },
            availableStock: { type: 'number' },
            quality: { type: 'string' },
            location: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            cooperativeId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            cooperativeId: { type: 'string', format: 'uuid' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'number' },
                  price: { type: 'number' },
                },
              },
            },
            totalAmount: { type: 'number' },
            deliveryAddress: { type: 'string' },
            paymentMethod: { type: 'string', enum: ['MOBILE_MONEY', 'BANK_TRANSFER', 'PAYPACK'] },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['MEMBER', 'SECRETARY', 'ACCOUNTANT'] },
            cooperativeId: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' },
            joinedAt: { type: 'string', format: 'date-time' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string', minLength: 2 },
            lastName: { type: 'string', minLength: 2 },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'COOP_ADMIN', 'BUYER'] },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        VerifyOTPRequest: {
          type: 'object',
          required: ['email', 'code'],
          properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'code', 'newPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string', minLength: 6, maxLength: 6 },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        CreateCooperativeRequest: {
          type: 'object',
          required: ['name', 'registrationNumber', 'email', 'phone', 'address', 'district', 'sector', 'cell', 'village', 'type'],
          properties: {
            name: { type: 'string', minLength: 3 },
            registrationNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            district: { type: 'string' },
            sector: { type: 'string' },
            cell: { type: 'string' },
            village: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            foundedDate: { type: 'string', format: 'date' },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: ['name', 'description', 'category', 'price', 'unit', 'availableStock'],
          properties: {
            name: { type: 'string', minLength: 3 },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number', minimum: 0 },
            unit: { type: 'string' },
            availableStock: { type: 'number', minimum: 0 },
            quality: { type: 'string' },
            location: { type: 'string' },
          },
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['items', 'deliveryAddress', 'paymentMethod'],
          properties: {
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['productId', 'quantity'],
                properties: {
                  productId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'number', minimum: 1 },
                },
              },
            },
            deliveryAddress: { type: 'string' },
            paymentMethod: { type: 'string', enum: ['MOBILE_MONEY', 'BANK_TRANSFER', 'PAYPACK'] },
            notes: { type: 'string' },
          },
        },
        InviteMemberRequest: {
          type: 'object',
          required: ['email', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['MEMBER', 'SECRETARY', 'ACCOUNTANT'] },
          },
        },
        AcceptInvitationRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            phone: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [], // Applies JWT Bearer token security globally to all endpoints
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Cooperatives', description: 'Cooperative management endpoints' },
      { name: 'Members', description: 'Member management endpoints' },
      { name: 'Products', description: 'Product management endpoints' },
      { name: 'Orders', description: 'Order management endpoints' },
      { name: 'Webhooks', description: 'Webhook endpoints' },
    ],
  },
  // Path to the API docs files
  apis: ['./src/routes/*.ts'], // Tells swagger-jsdoc to look in all .ts files in the routes directory
};

export const swaggerSpec = swaggerJsdoc(options);
