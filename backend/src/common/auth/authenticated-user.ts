export type UserRole = 'STUDENT' | 'TEACHER' | 'INCHARGE' | 'ADMIN' | 'PRINCIPAL';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: UserRole;
  email: string;
}
