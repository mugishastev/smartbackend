import { FastifyRequest } from 'fastify';
import { BadRequestException } from '@nestjs/common';

export interface MultipartFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
}

export interface MultipartData {
    body: Record<string, any>;
    files: Record<string, MultipartFile[]>;
}

interface MultipartRequest extends FastifyRequest {
    isMultipart: () => boolean;
    parts: () => AsyncIterableIterator<any>;
}

export async function processMultipartRequest(req: FastifyRequest): Promise<MultipartData> {
    const multipartReq = req as unknown as MultipartRequest;

    if (!multipartReq.isMultipart()) {
        throw new BadRequestException('Request is not multipart');
    }

    const body: Record<string, any> = {};
    const files: Record<string, MultipartFile[]> = {};

    for await (const part of multipartReq.parts()) {
        console.log('Processing part:', part.type, part.fieldname);
        if (part.type === 'file') {
            const buffer = await part.toBuffer();
            const file: MultipartFile = {
                fieldname: part.fieldname,
                originalname: part.filename,
                encoding: part.encoding,
                mimetype: part.mimetype,
                buffer: buffer,
                size: buffer.length,
            };

            if (!files[part.fieldname]) {
                files[part.fieldname] = [];
            }
            files[part.fieldname].push(file);
        } else {
            // Handle fields
            // fastify-multipart fields have 'value' property which might be a primitive or object if JSON
            // But for basic FormData, it's usually primitives.
            // @ts-ignore
            const value = part.value;
            console.log('Field value:', part.fieldname, value);

            // Basic handling for array fields (e.g. key[]) or just overwriting
            // For simplicity, we just assign. If array support is needed, check if body[part.fieldname] exists.
            body[part.fieldname] = value;
        }
    }

    return { body, files };
}
