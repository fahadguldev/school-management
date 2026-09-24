import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { getConfig } from '../config/config.service';
import { User } from '../../users/user.entity';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AccessTokenPayload {
  sub: string;
  organizationId: string;
  role: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (isPublic) {
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice('Bearer '.length);
        const config = getConfig();
        try {
          const payload = jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
          const user = await this.users.findOne({
            where: {
              id: payload.sub,
              organizationId: payload.organizationId,
              isActive: true,
            },
          });
          if (user) {
            request.user = {
              id: user.id,
              organizationId: user.organizationId,
              role: user.role,
              email: user.email,
            };
          }
        } catch {
          // Public endpoint: proceed without authenticated user context if token invalid
        }
      }
      return true;
    }

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length);
    const config = getConfig();

    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
      const user = await this.users.findOne({
        where: {
          id: payload.sub,
          organizationId: payload.organizationId,
          isActive: true,
        },
      });

      if (!user || user.role !== payload.role || user.email !== payload.email) {
        throw new UnauthorizedException('Invalid token context');
      }

      request.user = {
        id: user.id,
        organizationId: user.organizationId,
        role: user.role,
        email: user.email,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
