import { BaseRepository } from './base.repository';
import { db } from '../db';
import { securitySettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export type SecuritySetting = typeof securitySettings.$inferSelect;
export type InsertSecuritySetting = typeof securitySettings.$inferInsert;

export interface ISecuritySettingsRepository {
  findById(id: string): Promise<SecuritySetting>;
  findByIdOptional(id: string): Promise<SecuritySetting | undefined>;
  findAll(): Promise<SecuritySetting[]>;
  create(data: InsertSecuritySetting): Promise<SecuritySetting>;
  update(id: string, data: Partial<SecuritySetting>): Promise<SecuritySetting>;
  delete(id: string): Promise<boolean>;
  findByKey(settingKey: string): Promise<SecuritySetting | undefined>;
  upsertSetting(settingKey: string, settingValue: string, updatedBy: string, description?: string): Promise<SecuritySetting>;
  getAllSettings(): Promise<SecuritySetting[]>;
}

export class SecuritySettingsRepository extends BaseRepository<SecuritySetting, InsertSecuritySetting> implements ISecuritySettingsRepository {
  constructor() {
    super(securitySettings, 'id');
  }

  async findByKey(settingKey: string): Promise<SecuritySetting | undefined> {
    try {
      const results = await db
        .select()
        .from(securitySettings)
        .where(eq(securitySettings.settingKey, settingKey))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'SecuritySettingsRepository.findByKey');
    }
  }

  async upsertSetting(settingKey: string, settingValue: string, updatedBy: string, description?: string): Promise<SecuritySetting> {
    try {
      return await this.executeInTransaction(async (tx) => {
        const existing = await tx
          .select()
          .from(securitySettings)
          .where(eq(securitySettings.settingKey, settingKey))
          .limit(1);

        if (existing[0]) {
          const updated = await tx
            .update(securitySettings)
            .set({
              settingValue,
              updatedBy,
              updatedAt: new Date()
            })
            .where(eq(securitySettings.settingKey, settingKey))
            .returning();
          return updated[0];
        } else {
          const inserted = await tx
            .insert(securitySettings)
            .values({
              settingKey,
              settingValue,
              updatedBy,
              description: description || this.getDefaultDescription(settingKey)
            })
            .returning();
          return inserted[0];
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'SecuritySettingsRepository.upsertSetting');
    }
  }

  async getAllSettings(): Promise<SecuritySetting[]> {
    try {
      return await db
        .select()
        .from(securitySettings)
        .orderBy(securitySettings.settingKey);
    } catch (error) {
      handleDatabaseError(error, 'SecuritySettingsRepository.getAllSettings');
    }
  }

  private getDefaultDescription(settingKey: string): string {
    const descriptions: Record<string, string> = {
      'team_login_visible': 'Controls whether the team login option is visible on the authentication page',
      'maintenance_mode': 'Enables maintenance mode which blocks all users except admins and forces logout',
      'forum_cooling_period_enabled': 'When enabled, new accounts must wait 1 hour before posting in community forum',
      'force_logout_enabled': 'When enabled, forces all users to log out and prevents new logins',
      'secret_search_code': 'Secret code required for team member registration'
    };
    return descriptions[settingKey] || 'Custom security setting';
  }
}

export const securitySettingsRepository = new SecuritySettingsRepository();
