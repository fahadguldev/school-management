import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/user.entity';
import { AuthenticatedUser, UserRole } from '../src/common/auth/authenticated-user';
import { InMemoryRepository } from './helpers/in-memory-repository';

function actor(role: UserRole): AuthenticatedUser {
  return {
    id: 'actor-1',
    email: 'actor@test.local',
    role,
    organizationId: 'org-a',
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    organizationId: 'org-a',
    isActive: true,
    isEmailVerified: true,
    email: 'someone@test.local',
    passwordHash: `$2b$10$${'a'.repeat(53)}`,
    firstName: 'Test',
    lastName: 'User',
    role: 'TEACHER',
    refreshToken: 'live-refresh-token',
    resetPasswordToken: null,
    resetPasswordExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('UsersService secret handling', () => {
  let users: InMemoryRepository<User>;
  let service: UsersService;

  beforeEach(async () => {
    users = new InMemoryRepository<User>(() => makeUser());

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('never returns the password hash, refresh token or reset token', async () => {
    users.seed(makeUser({ id: 'user-1', resetPasswordToken: 'reset-me' }));

    const listed = await service.listUsers(actor('ADMIN'));
    const single = await service.getUser('user-1', actor('ADMIN'));

    for (const result of [listed[0], single]) {
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('resetPasswordToken');
    }
  });

  it('ignores an attempt to set passwordHash directly', async () => {
    users.seed(makeUser({ id: 'user-1' }));
    const before = (users.peek('user-1') as User).passwordHash;

    await service.updateUser(
      'user-1',
      { passwordHash: 'attacker-chosen-hash' } as Partial<User>,
      actor('ADMIN'),
    );

    expect((users.peek('user-1') as User).passwordHash).toBe(before);
  });

  it('hashes a new password with bcrypt and revokes outstanding sessions', async () => {
    users.seed(makeUser({ id: 'user-1' }));

    await service.updateUser(
      'user-1',
      { password: 'RotatedPass456!' },
      actor('ADMIN'),
    );

    const stored = users.peek('user-1') as User;
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.passwordHash).not.toContain('RotatedPass456!');
    expect(stored.refreshToken).toBeNull();
  });

  it('stops a PRINCIPAL from minting an ADMIN', async () => {
    await expect(
      service.createUser(
        {
          email: 'escalate@test.local',
          firstName: 'Escalate',
          lastName: 'User',
          role: 'ADMIN',
          password: 'Whatever123!',
        } as Partial<User> & { password: string },
        actor('PRINCIPAL'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stops a PRINCIPAL from promoting an existing user to ADMIN', async () => {
    users.seed(makeUser({ id: 'user-1' }));

    await expect(
      service.updateUser('user-1', { role: 'ADMIN' }, actor('PRINCIPAL')),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect((users.peek('user-1') as User).role).toBe('TEACHER');
  });

  it('allows an ADMIN to assign ADMIN or PRINCIPAL', async () => {
    users.seed(makeUser({ id: 'user-1' }));

    await service.updateUser('user-1', { role: 'PRINCIPAL' }, actor('ADMIN'));

    expect((users.peek('user-1') as User).role).toBe('PRINCIPAL');
  });

  it('requires an explicit role when creating a user', async () => {
    await expect(
      service.createUser(
        { email: 'norole@test.local', firstName: 'No', lastName: 'Role' },
        actor('ADMIN'),
      ),
    ).rejects.toThrow(/role is required/);
  });
});