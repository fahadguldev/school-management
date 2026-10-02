import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/user.entity';
import { Student } from '../src/students/student.entity';
import { AuthenticatedUser, UserRole } from '../src/common/auth/authenticated-user';
import { TenantCrudService } from '../src/common/crud/tenant-crud.service';
import { InMemoryRepository } from './helpers/in-memory-repository';

const SCHOOL_A = 'org-a';
const SCHOOL_B = 'org-b';

function actor(organizationId: string, role: UserRole = 'ADMIN'): AuthenticatedUser {
  return {
    id: 'actor-1',
    email: 'actor@test.local',
    role,
    organizationId,
  };
}

function makeUser(overrides: Partial<User>): User {
  return {
    id: 'user-1',
    organizationId: SCHOOL_A,
    isActive: true,
    isEmailVerified: true,
    email: 'someone@test.local',
    passwordHash: `$2b$10$${'a'.repeat(53)}`,
    firstName: 'Test',
    lastName: 'User',
    role: 'TEACHER',
    refreshToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('tenant isolation', () => {
  let users: InMemoryRepository<User>;
  let service: UsersService;
  let aUser: User;
  let bUser: User;

  beforeEach(async () => {
    users = new InMemoryRepository<User>(() => makeUser({}));

    aUser = users.seed(
      makeUser({ id: 'user-a', organizationId: SCHOOL_A, email: 'a@test.local' }),
    );
    bUser = users.seed(
      makeUser({ id: 'user-b', organizationId: SCHOOL_B, email: 'b@test.local' }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('lists only users belonging to the caller organization', async () => {
    const result = await service.listUsers(actor(SCHOOL_A));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(aUser.id);
  });

  it('never returns another tenant record', async () => {
    await expect(
      service.getUser(bUser.id, actor(SCHOOL_A)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the caller own record', async () => {
    const result = await service.getUser(aUser.id, actor(SCHOOL_A));

    expect(result.id).toBe(aUser.id);
  });

  it('stamps the caller organization on create, ignoring the payload', async () => {
    const created = await service.createUser(
      {
        email: 'new@test.local',
        firstName: 'New',
        lastName: 'Staff',
        role: 'TEACHER',
        organizationId: SCHOOL_B,
        password: 'InitialPass123!',
      } as Partial<User> & { password: string },
      actor(SCHOOL_A),
    );

    expect(created.organizationId).toBe(SCHOOL_A);
  });

  it('stamps the caller organization on update, ignoring the payload', async () => {
    await expect(
      service.updateUser(
        aUser.id,
        { organizationId: SCHOOL_B, firstName: 'Renamed' },
        actor(SCHOOL_A),
      ),
    ).resolves.toBeTruthy();

    expect((users.peek(aUser.id) as User).organizationId).toBe(SCHOOL_A);
    expect((users.peek(aUser.id) as User).firstName).toBe('Renamed');
  });

  it('refuses to update a user in another organization', async () => {
    await expect(
      service.updateUser(bUser.id, { firstName: 'Hijacked' }, actor(SCHOOL_A)),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect((users.peek(bUser.id) as User).firstName).toBe('Test');
  });

  it('scopes a non-user tenant resource the same way', async () => {
    const students = new InMemoryRepository<Student>(() => ({
      id: '',
    } as Student));

    students.seed({ id: 'st-a', organizationId: SCHOOL_A } as Student);
    students.seed({ id: 'st-b', organizationId: SCHOOL_B } as Student);

    // The same TenantCrudService base that students, teachers, classes and fees use.
    const crud = new TenantCrudService<Student>(
      students as unknown as Repository<Student>,
    );

    await expect(crud.findOne('st-b', actor(SCHOOL_A))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(crud.findOne('st-a', actor(SCHOOL_A))).resolves.toMatchObject({
      id: 'st-a',
    });
    await expect(crud.findAll(actor(SCHOOL_B))).resolves.toHaveLength(1);
  });
});