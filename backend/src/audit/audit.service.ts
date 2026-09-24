import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../common/database/audit-log.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';

export interface RecordAuditParams {
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /**
   * Records an immutable audit log entry for sensitive tenant operations.
   */
  async recordLog(params: RecordAuditParams): Promise<AuditLog | null> {
    try {
      const log = this.repo.create({
        organizationId: params.organizationId,
        user: { id: params.userId } as any,
        action: params.action,
        resource: params.resource,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        ipAddress: params.ipAddress || '127.0.0.1',
        userAgent: params.userAgent || 'API Client',
      });

      return await this.repo.save(log);
    } catch (err: any) {
      this.logger.warn(`Failed to record audit log: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieves audit logs for the authenticated organization with filtering and sorting.
   */
  async findLogs(
    user: AuthenticatedUser,
    filters?: { action?: string; resource?: string; limit?: number },
  ) {
    const where: any = { organizationId: user.organizationId };
    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;

    const take = filters?.limit ? Math.min(Number(filters.limit), 100) : 50;

    const logs = await this.repo.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      user: {
        id: log.user?.id,
        email: log.user?.email,
        role: log.user?.role,
        name: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim() || log.user?.email,
      },
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.createdAt,
    }));
  }
}
