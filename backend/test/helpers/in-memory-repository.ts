import { randomUUID } from 'crypto';

/**
 * Minimal in-memory stand-in for a TypeORM Repository.
 *
 * The entities in this project use Postgres-only column types (uuid, timestamp)
 * that the SQLite driver cannot synchronize, so the service tests exercise the
 * real services against this fake instead of a throwaway database. It implements
 * just enough of the Repository surface the services touch, and — critically —
 * applies the `where` filter the tenant services rely on, so cross-tenant
 * isolation is genuinely tested rather than mocked away.
 */
export class InMemoryRepository<T extends { id: string }> {
  private readonly rows: T[] = [];

  constructor(private readonly factory: () => T = () => ({ id: '' }) as T) {}

  create(partial: Partial<T>): T {
    return Object.assign(this.factory(), partial);
  }

  private matches(row: T, where: Record<string, unknown> | undefined): boolean {
    if (!where) {
      return true;
    }

    return Object.entries(where).every(([key, value]) => {
      if (value === undefined) {
        return true;
      }

      return (row as Record<string, unknown>)[key] === value;
    });
  }

  private matchesCriteria(row: T, criteria: unknown): boolean {
    if (typeof criteria === 'string') {
      return row.id === criteria;
    }

    return this.matches(row, criteria as Record<string, unknown>);
  }

  async save(entity: T): Promise<T> {
    const now = new Date();
    const record = entity as unknown as Record<string, unknown>;

    if (!record.id) {
      record.id = randomUUID();
    }

    record.createdAt = record.createdAt ?? now;
    record.updatedAt = now;

    const existingIndex = this.rows.findIndex((row) => row.id === record.id);
    if (existingIndex === -1) {
      this.rows.push(entity);
    } else {
      this.rows[existingIndex] = entity;
    }

    return entity;
  }

  async findOne(options: {
    where?: Record<string, unknown>;
  }): Promise<T | null> {
    return (
      this.rows.find((row) => this.matches(row, options.where)) ?? null
    );
  }

  async find(options: {
    where?: Record<string, unknown>;
  }): Promise<T[]> {
    return this.rows.filter((row) => this.matches(row, options.where));
  }

  async findOneBy(where: Record<string, unknown>): Promise<T | null> {
    return this.findOne({ where });
  }

  async findBy(where: Record<string, unknown>): Promise<T[]> {
    return this.find({ where });
  }

  async update(
    criteria: unknown,
    partial: Partial<T>,
  ): Promise<{ affected: number }> {
    const targets = this.rows.filter((row) =>
      this.matchesCriteria(row, criteria),
    );

    for (const row of targets) {
      Object.assign(row, partial, { updatedAt: new Date() });
    }

    return { affected: targets.length };
  }

  async count(): Promise<number> {
    return this.rows.length;
  }

  /** Test helper: seed a row without going through save(). */
  seed(row: T): T {
    this.rows.push(row);
    return row;
  }

  /** Test helper: inspect raw stored state, bypassing service sanitization. */
  peek(id: string): T | undefined {
    return this.rows.find((row) => row.id === id);
  }
}