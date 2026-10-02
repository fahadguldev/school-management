import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/users/user.entity';
import { Organization } from '../src/organizations/organization.entity';
import { getConfig } from '../src/common/config/config.service';
import { InMemoryRepository } from './helpers/in-memory-repository';

const PASSWORD = 'AdminSecret123!';

function legacyHash(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

describe('AuthService', () => {
  let auth: AuthService;
  let users: InMemoryRepository<User>;
  let organizations: InMemoryRepository<Organization>;

  beforeEach(async () => {
    users = new InMemoryRepository<User>(
      () => ({ id: '', isActive: true, isEmailVerified: false }) as User,
    );
    organizations = new InMemoryRepository<Organization>(
      () => ({ id: '' }) as Organization,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Organization), useValue: organizations },
      ],
    }).compile();

    auth = moduleRef.get(AuthService);
  });

  async function bootstrap() {
    return auth.bootstrapSchool({
      schoolName: 'Horizon Grammar School',
      email: 'admin@horizon.test',
      password: PASSWORD,
      firstName: 'Tariq',
      lastName: 'Mehmood',
    });
  }

  describe('bootstrapSchool', () => {
    it('creates the organization and an ADMIN user with a bcrypt hash', async () => {
      const result = await bootstrap();

      expect(await organizations.count()).toBeGreaterThan(0);
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.organizationId).toBeTruthy();

      const stored = users.peek(result.user.id) as User;
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(stored.passwordHash).not.toBe(legacyHash(PASSWORD));
      expect(stored.organizationId).toBe(result.user.organizationId);
    });

    it('issues an access and a refresh token', async () => {
      const result = await bootstrap();

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.accessToken).not.toEqual(result.refreshToken);
    });

    it('rejects a duplicate email', async () => {
      await bootstrap();

      await expect(
        auth.bootstrapSchool({
          schoolName: 'Second School',
          email: 'admin@horizon.test',
          password: 'AnotherSecret123!',
          firstName: 'Other',
          lastName: 'Admin',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('token contents', () => {
    it('carries the user id, tenant and role in the access token', async () => {
      const config = getConfig();
      const result = await bootstrap();

      const payload = jwt.verify(result.accessToken, config.jwt.accessSecret) as {
        sub: string;
        organizationId: string;
        role: string;
        email: string;
      };

      expect(payload.sub).toBe(result.user.id);
      expect(payload.organizationId).toBe(result.user.organizationId);
      expect(payload.role).toBe('ADMIN');
      expect(payload.email).toBe('admin@horizon.test');
    });

    it('keeps tenant and role out of the refresh token', async () => {
      const config = getConfig();
      const result = await bootstrap();

      const payload = jwt.verify(
        result.refreshToken,
        config.jwt.refreshSecret,
      ) as Record<string, unknown>;

      expect(payload.sub).toBe(result.user.id);
      expect(payload.organizationId).toBeUndefined();
      expect(payload.role).toBeUndefined();
    });
  });

  describe('login', () => {
    it('accepts the correct password', async () => {
      const created = await bootstrap();

      const result = await auth.login('admin@horizon.test', PASSWORD);

      expect(result.user.id).toBe(created.user.id);
    });

    it('rejects a wrong password', async () => {
      await bootstrap();

      await expect(
        auth.login('admin@horizon.test', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email', async () => {
      await expect(
        auth.login('nobody@horizon.test', PASSWORD),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a deactivated user', async () => {
      const created = await bootstrap();
      const stored = users.peek(created.user.id) as User;
      stored.isActive = false;

      await expect(
        auth.login('admin@horizon.test', PASSWORD),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('upgrades a legacy SHA-256 hash on successful sign-in', async () => {
      const created = await bootstrap();
      const stored = users.peek(created.user.id) as User;
      stored.passwordHash = legacyHash(PASSWORD);

      await auth.login('admin@horizon.test', PASSWORD);

      const after = users.peek(created.user.id) as User;
      expect(after.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(after.passwordHash).not.toBe(legacyHash(PASSWORD));
    });

    it('does not rewrite an already-current bcrypt hash', async () => {
      const created = await bootstrap();
      const before = (users.peek(created.user.id) as User).passwordHash;

      await auth.login('admin@horizon.test', PASSWORD);

      expect((users.peek(created.user.id) as User).passwordHash).toBe(before);
    });

    it('does not upgrade the hash when the password is wrong', async () => {
      const created = await bootstrap();
      const stored = users.peek(created.user.id) as User;
      const legacy = legacyHash(PASSWORD);
      stored.passwordHash = legacy;

      await expect(
        auth.login('admin@horizon.test', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect((users.peek(created.user.id) as User).passwordHash).toBe(legacy);
    });
  });

  describe('refresh', () => {
    it('issues a new token pair for a valid refresh token', async () => {
      const created = await bootstrap();

      const refreshed = await auth.refresh(created.refreshToken);

      expect(refreshed.accessToken).toBeTruthy();
      expect(refreshed.user.id).toBe(created.user.id);
    });

    it('rejects a refresh token that is not the one on record', async () => {
      const created = await bootstrap();
      const stored = users.peek(created.user.id) as User;
      stored.refreshToken = 'some-other-token';

      await expect(auth.refresh(created.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a garbage token', async () => {
      await expect(auth.refresh('not-a-jwt')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token so it cannot be reused', async () => {
      const created = await bootstrap();

      await auth.logout(created.user.id);

      const stored = users.peek(created.user.id) as User;
      expect(stored.refreshToken).toBeNull();
      await expect(auth.refresh(created.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('password reset', () => {
    it('stores a token and expiry without revealing whether the user exists', async () => {
      await bootstrap();

      const known = await auth.requestPasswordReset('admin@horizon.test');
      expect(known.resetToken).toBeTruthy();

      const unknown = await auth.requestPasswordReset('ghost@horizon.test');
      expect(unknown.resetToken).toBe('');
    });

    it('replaces the hash with bcrypt and revokes outstanding sessions', async () => {
      const created = await bootstrap();
      const { resetToken } = await auth.requestPasswordReset(
        'admin@horizon.test',
      );

      const NEW_PASSWORD = 'BrandNewSecret456!';
      await auth.resetPassword(resetToken, NEW_PASSWORD);

      const stored = users.peek(created.user.id) as User;
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(stored.resetPasswordToken).toBeNull();
      expect(stored.resetPasswordExpires).toBeNull();
      expect(stored.refreshToken).toBeNull();

      await expect(auth.refresh(created.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      await expect(
        auth.login('admin@horizon.test', NEW_PASSWORD),
      ).resolves.toBeTruthy();
      await expect(
        auth.login('admin@horizon.test', PASSWORD),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown reset token', async () => {
      await bootstrap();

      await expect(
        auth.resetPassword('made-up-token', 'Whatever123!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired reset token', async () => {
      const created = await bootstrap();
      const { resetToken } = await auth.requestPasswordReset(
        'admin@horizon.test',
      );

      const stored = users.peek(created.user.id) as User;
      stored.resetPasswordExpires = new Date(Date.now() - 1000);

      await expect(
        auth.resetPassword(resetToken, 'Whatever123!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});