import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SubscriptionPlanRepository } from '../subscription.repository';
import { db } from '../../db';
import { subscriptionPlans } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('SubscriptionPlanRepository - Versioning', () => {
  let repository: SubscriptionPlanRepository;
  let testBasePlanId: string;
  
  beforeEach(async () => {
    repository = new SubscriptionPlanRepository();
    
    const tempId = crypto.randomUUID();
    
    const [basePlan] = await db
      .insert(subscriptionPlans)
      .values({
        id: tempId,
        name: 'Test Plan',
        price: '9999',
        currency: 'INR',
        features: ['Feature 1'],
        tierLevel: 1,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7,
        supportType: 'email',
        universityTier: 'general',
        basePlanId: tempId,
        version: 1,
        isLatestVersion: true,
      })
      .returning();
    
    testBasePlanId = basePlan.id;
  });
  
  afterEach(async () => {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.basePlanId, testBasePlanId));
  });
  
  it('should create new version correctly', async () => {
    const version2 = await repository.createNewVersion(
      testBasePlanId,
      { price: '14999', description: 'Price increased' },
      'admin-id-123'
    );
    
    expect(version2.basePlanId).toBe(testBasePlanId);
    expect(version2.version).toBe(2);
    expect(version2.price).toBe('14999.00');
    expect(version2.isLatestVersion).toBe(true);
    
    const version1 = await repository.findPlanVersion(testBasePlanId, 1);
    expect(version1?.isLatestVersion).toBe(false);
  });
  
  it('should find latest versions only', async () => {
    await repository.createNewVersion(testBasePlanId, { price: '14999' }, 'admin-id');
    
    const latestPlans = await repository.findLatestVersions({ isActive: true });
    const testPlanVersions = latestPlans.filter(p => p.basePlanId === testBasePlanId);
    
    expect(testPlanVersions.length).toBe(1);
    expect(testPlanVersions[0].version).toBe(2);
  });
  
  it('should get correct latest version number', async () => {
    let latestVersion = await repository.getLatestVersionNumber(testBasePlanId);
    expect(latestVersion).toBe(1);
    
    await repository.createNewVersion(testBasePlanId, { price: '14999' }, 'admin-id');
    
    latestVersion = await repository.getLatestVersionNumber(testBasePlanId);
    expect(latestVersion).toBe(2);
  });
  
  it('should find all versions of plan family', async () => {
    await repository.createNewVersion(testBasePlanId, { price: '14999' }, 'admin-id');
    await repository.createNewVersion(testBasePlanId, { price: '19999' }, 'admin-id');
    
    const allVersions = await repository.findAllVersionsOfPlan(testBasePlanId);
    
    expect(allVersions.length).toBe(3);
    expect(allVersions[0].version).toBe(3);
    expect(allVersions[1].version).toBe(2);
    expect(allVersions[2].version).toBe(1);
  });
});
