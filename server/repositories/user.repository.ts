import { BaseRepository } from './base.repository';
import { User, InsertUser, users } from '@shared/schema';
import { db } from '../db';
import { eq, and, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { UserFilters } from '../types/repository-filters';

export interface IUserRepository {
  findById(id: string): Promise<User>;
  findByIdOptional(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  findByUsername(username: string): Promise<User | undefined>;
  findTeamMembers(): Promise<User[]>;
  findCounselors(): Promise<User[]>;
  findAllTeamMembers(): Promise<User[]>;
  findAll(filters?: UserFilters): Promise<User[]>;
  create(data: InsertUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
}

export class UserRepository extends BaseRepository<User, InsertUser> implements IUserRepository {
  constructor() {
    super(users, 'id');
  }

  async findByEmail(email: string): Promise<User | undefined> {
    try {
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'UserRepository.findByEmail');
    }
  }

  async findByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;
    
    try {
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, username))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'UserRepository.findByUsername');
    }
  }

  async findTeamMembers(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(and(
          eq(users.userType, 'team_member'),
          eq(users.teamRole, 'counselor')
        ));
    } catch (error) {
      handleDatabaseError(error, 'UserRepository.findTeamMembers');
    }
  }

  async findCounselors(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(and(
          eq(users.userType, 'team_member'),
          eq(users.teamRole, 'counselor')
        ));
    } catch (error) {
      handleDatabaseError(error, 'UserRepository.findCounselors');
    }
  }

  async findAllTeamMembers(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(eq(users.userType, 'team_member'));
    } catch (error) {
      handleDatabaseError(error, 'UserRepository.findAllTeamMembers');
    }
  }

  async findAll(filters?: UserFilters): Promise<User[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.email) {
          conditions.push(eq(users.email, filters.email));
        }
        if (filters.userType) {
          conditions.push(eq(users.userType, filters.userType));
        }
        if (filters.teamRole) {
          conditions.push(eq(users.teamRole, filters.teamRole));
        }
        if (filters.accountStatus) {
          conditions.push(eq(users.accountStatus, filters.accountStatus));
        }
      }
      
      let query = db.select().from(users);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query as User[];
    } catch (error) {
      handleDatabaseError(error, 'UserRepository.findAll');
    }
  }
}

export const userRepository = new UserRepository();
