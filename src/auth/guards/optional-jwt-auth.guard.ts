import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // Override handleRequest to allow requests without a token
    handleRequest(err: any, user: any, info: any) {
        // If there is an error or no user, just return null instead of throwing an UnauthorizedException
        if (err || !user) {
            return null;
        }
        return user;
    }
}
