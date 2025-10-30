import { db } from '../db';
import { PgTable } from 'drizzle-orm/pg-core';
import { eq, and, sql, SQL } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import * as schema from '../../shared/schema';
import { handleDatabaseError, DatabaseError, TransactionError, NotFoundError } from './errors';

export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type DbOrTransaction = typeof db | Transaction;

export interface DeleteResult {
  rowCount: number;
}

type TableColumn = ReturnType<typeof sql.raw>;

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export interface IBaseRepository<T, TInsert> {
  findById(id: string, tx?: DbOrTransaction): Promise<T>;
  findByIdOptional(id: string, tx?: DbOrTransaction): Promise<T | undefined>;
  findAll(filters?: Partial<T>, tx?: DbOrTransaction): Promise<T[]>;
  create(data: TInsert, tx?: DbOrTransaction): Promise<T>;
  update(id: string, data: Partial<T>, tx?: DbOrTransaction): Promise<T>;
  delete(id: string, tx?: DbOrTransaction): Promise<boolean>;
  executeInTransaction<TResult>(callback: (tx: Transaction) => Promise<TResult>): Promise<TResult>;
}

export abstract class BaseRepository<T, TInsert> implements IBaseRepository<T, TInsert> {
  constructor(
    protected table: PgTable,
    protected primaryKey: string = 'id'
  ) {}

  protected getPrimaryKeyColumn(): ReturnType<typeof sql.raw> {
    return (this.table as unknown as Record<string, ReturnType<typeof sql.raw>>)[this.primaryKey];
  }

  async findById(id: string, tx?: DbOrTransaction): Promise<T> {
    try {
      const executor = tx || db;
      const results = await executor
        .select()
        .from(this.table)
        .where(eq(this.getPrimaryKeyColumn(), id))
        .limit(1);
      
      if (!results[0]) {
        throw new NotFoundError(this.table.toString(), id);
      }
      
      return results[0] as T;
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.findById`);
    }
  }

  async findByIdOptional(id: string, tx?: DbOrTransaction): Promise<T | undefined> {
    try {
      const executor = tx || db;
      const results = await executor
        .select()
        .from(this.table)
        .where(eq(this.getPrimaryKeyColumn(), id))
        .limit(1);
      return results[0] as T | undefined;
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.findByIdOptional`);
    }
  }

  async findAll(filters?: Partial<T>, tx?: DbOrTransaction): Promise<T[]> {
    try {
      const executor = tx || db;
      let query = executor.select().from(this.table);
      
      if (filters) {
        const conditions = Object.entries(filters)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq((this.table as unknown as Record<string, ReturnType<typeof sql.raw>>)[key], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }
      }
      
      return await query as T[];
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.findAll`);
    }
  }

  async create(data: TInsert, tx?: DbOrTransaction): Promise<T> {
    try {
      const executor = tx || db;
      const results = await executor.insert(this.table).values(data as typeof this.table.$inferInsert).returning();
      return results[0] as T;
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.create`);
    }
  }

  async update(id: string, data: Partial<T>, tx?: DbOrTransaction): Promise<T> {
    try {
      const executor = tx || db;
      const results = await executor
        .update(this.table)
        .set(data as typeof this.table.$inferInsert)
        .where(eq(this.getPrimaryKeyColumn(), id))
        .returning();
      
      if (!results[0]) {
        throw new NotFoundError(this.table.toString(), id);
      }
      
      return results[0] as T;
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.update`);
    }
  }

  async delete(id: string, tx?: DbOrTransaction): Promise<boolean> {
    try {
      const executor = tx || db;
      const result = await executor
        .delete(this.table)
        .where(eq(this.getPrimaryKeyColumn(), id)) as unknown as DeleteResult;
      return result.rowCount > 0;
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.delete`);
    }
  }

  protected async findOne(conditions: SQL | undefined, tx?: DbOrTransaction): Promise<T | undefined> {
    try {
      const executor = tx || db;
      const results = await executor
        .select()
        .from(this.table)
        .where(conditions)
        .limit(1);
      return results[0] as T | undefined;
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.findOne`);
    }
  }

  protected async findMany(conditions?: SQL, tx?: DbOrTransaction): Promise<T[]> {
    try {
      const executor = tx || db;
      let query = executor.select().from(this.table);
      
      if (conditions) {
        query = query.where(conditions) as typeof query;
      }
      
      return await query as T[];
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.findMany`);
    }
  }

  protected async count(conditions?: SQL, tx?: DbOrTransaction): Promise<number> {
    try {
      const executor = tx || db;
      let query = executor
        .select({ count: sql<number>`count(*)` })
        .from(this.table);
      
      if (conditions) {
        query = query.where(conditions) as typeof query;
      }
      
      const result = await query;
      return Number(result[0]?.count || 0);
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.count`);
    }
  }

  protected async exists(conditions: SQL, tx?: DbOrTransaction): Promise<boolean> {
    try {
      const count = await this.count(conditions, tx);
      return count > 0;
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.exists`);
    }
  }

  protected async paginate<TData = T>(
    query: unknown,
    options: PaginationOptions,
    conditions?: SQL,
    tx?: DbOrTransaction
  ): Promise<PaginatedResult<TData>> {
    try {
      const { limit, offset } = options;

      // Get total count
      const total = await this.count(conditions, tx);

      // Get paginated data - query should already have where clause applied
      const data = await (query as { limit: (l: number) => { offset: (o: number) => Promise<TData[]> } }).limit(limit).offset(offset);

      return {
        data: data as TData[],
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      };
    } catch (error) {
      handleDatabaseError(error, `${this.table.toString()}.paginate`);
    }
  }

  protected buildFilters<TFilters extends Record<string, unknown>>(
    filters?: TFilters
  ): SQL[] {
    if (!filters) return [];

    return Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => eq((this.table as unknown as Record<string, ReturnType<typeof sql.raw>>)[key], value));
  }

  async executeInTransaction<TResult>(
    callback: (tx: Transaction) => Promise<TResult>
  ): Promise<TResult> {
    try {
      // Type assertion needed due to Drizzle's complex transaction type inference
      return await db.transaction(callback as never);
    } catch (error) {
      throw new TransactionError('transaction execution', error);
    }
  }
}
