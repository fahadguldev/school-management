import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { getConfig } from '../common/config/config.service';
import { UserRole } from '../common/auth/authenticated-user';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
  ) {}

  async bootstrapSchool(payload: {
    schoolName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    const existing = await this.users.findOne({ where: { email: payload.email } });
    if (existing) {
      throw new BadRequestException('Email is already in use');
    }

    const organization = await this.organizations.save(
      this.organizations.create({
        name: payload.schoolName,
      }),
    );

    const user = this.users.create({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: 'ADMIN',
      organizationId: organization.id,
    });
    user.setPassword(payload.password);

    await this.users.save(user);
    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.users.findOne({ where: { email, isActive: true } });

    if (!user || !user.validatePassword(password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const config = getConfig();

    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { sub: string };
      const user = await this.users.findOne({
        where: { id: payload.sub, refreshToken, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.issueTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<{ success: true }> {
    await this.users.update({ id: userId }, { refreshToken: null });
    return { success: true };
  }

  async requestPasswordReset(email: string): Promise<{ resetToken: string }> {
    const user = await this.users.findOne({ where: { email, isActive: true } });

    if (!user) {
      return { resetToken: '' };
    }

    const resetToken = randomUUID();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await this.users.save(user);

    return { resetToken };
  }

  async resetPassword(token: string, password: string): Promise<{ success: true }> {
    const user = await this.users.findOne({ where: { resetPasswordToken: token } });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.setPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.users.save(user);

    return { success: true };
  }

  private async issueTokens(user: User): Promise<AuthResponse> {
    const config = getConfig();
    const payload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role as UserRole,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    });
    const refreshToken = jwt.sign({ sub: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    user.refreshToken = refreshToken;
    await this.users.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}
