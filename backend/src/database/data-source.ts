import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildPostgresOptions } from './database-options';
import { getConfig } from '../common/config/config.service';

/**
 * DataSource used by the TypeORM CLI (migration:generate / run / revert).
 * The Nest application builds its own connection options at runtime.
 */
const dataSource = new DataSource(buildPostgresOptions(getConfig()));

export default dataSource;