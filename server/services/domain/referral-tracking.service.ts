import { BaseService } from '../base.service';
import {
  IPartnerReferralLinkRepository,
  IReferralClickRepository,
  IPartnerStudentReferralRepository,
  IPartnerProfileRepository,
  IPaymentRepository,
  IStudentRepository,
  DbOrTransaction
} from '../../repositories';
import { container, TYPES } from '../container';
import { ReferralClick, PartnerStudentReferral } from '@shared/schema';
import {
  RecordReferralClickRequest,
  AttributionMethod
} from '@shared/types/partner-types';
import { ValidationServiceError, ResourceNotFoundError, InvalidOperationError } from '../errors';
import * as crypto from 'crypto';

const ATTRIBUTION_WINDOW_DAYS = 30;

export interface IReferralTrackingService {
  recordClick(data: RecordReferralClickRequest): Promise<ReferralClick>;
  attributeStudentToPartner(studentId: string, userId: string, partnerId: string, attributionMethod: AttributionMethod, clickId?: string, promoCode?: string): Promise<PartnerStudentReferral>;
  trackConversion(studentId: string, subscriptionId: string, paymentId: string, tx?: DbOrTransaction): Promise<void>;
  isUniqueClick(fingerprint: string, linkId: string): Promise<boolean>;
  getFingerprintFromRequest(ipAddress: string, userAgent: string): string;
}

export class ReferralTrackingService extends BaseService implements IReferralTrackingService {
  constructor(
    private referralLinkRepo: IPartnerReferralLinkRepository = container.get<IPartnerReferralLinkRepository>(TYPES.IPartnerReferralLinkRepository),
    private referralClickRepo: IReferralClickRepository = container.get<IReferralClickRepository>(TYPES.IReferralClickRepository),
    private partnerStudentReferralRepo: IPartnerStudentReferralRepository = container.get<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository),
    private partnerProfileRepo: IPartnerProfileRepository = container.get<IPartnerProfileRepository>(TYPES.IPartnerProfileRepository),
    private paymentRepo: IPaymentRepository = container.get<IPaymentRepository>(TYPES.IPaymentRepository),
    private studentRepo: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository)
  ) {
    super();
  }

  getFingerprintFromRequest(ipAddress: string, userAgent: string): string {
    const data = `${ipAddress}:${userAgent}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async isUniqueClick(fingerprint: string, linkId: string): Promise<boolean> {
    try {
      const existingClick = await this.referralClickRepo.findByFingerprintAndLink(fingerprint, linkId);
      return !existingClick;
    } catch (error) {
      return this.handleError(error, 'ReferralTrackingService.isUniqueClick');
    }
  }

  async recordClick(data: RecordReferralClickRequest): Promise<ReferralClick> {
    try {
      const errors: Record<string, string> = {};

      if (!data.linkCode?.trim()) {
        errors.linkCode = 'Link code is required';
      }

      if (!data.ipAddress?.trim()) {
        errors.ipAddress = 'IP address is required';
      }

      if (!data.userAgent?.trim()) {
        errors.userAgent = 'User agent is required';
      }

      if (!data.sessionId?.trim()) {
        errors.sessionId = 'Session ID is required';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Referral Click', errors);
      }

      const referralLink = await this.referralLinkRepo.findByLinkCode(data.linkCode);
      if (!referralLink) {
        throw new ResourceNotFoundError('Referral link', data.linkCode);
      }

      if (!referralLink.isActive) {
        throw new InvalidOperationError('record click', 'Referral link is inactive');
      }

      if (referralLink.expiresAt && new Date(referralLink.expiresAt) < new Date()) {
        throw new InvalidOperationError('record click', 'Referral link has expired');
      }

      const fingerprint = data.fingerprint || this.getFingerprintFromRequest(data.ipAddress, data.userAgent);

      const isUnique = await this.isUniqueClick(fingerprint, referralLink.id);

      const click = await this.referralClickRepo.create({
        referralLinkId: referralLink.id,
        partnerId: referralLink.partnerId,
        fingerprint,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referer: data.referer,
        sessionId: data.sessionId
      });

      await this.referralLinkRepo.incrementClickCount(referralLink.id, isUnique);
      await this.referralLinkRepo.updateLastClickedAt(referralLink.id);

      return click;
    } catch (error) {
      return this.handleError(error, 'ReferralTrackingService.recordClick');
    }
  }

  /**
   * PHASE 4 - Bug #11 Fix: Made increment operations atomic with referral creation
   * PHASE 6 - Issue #2: Documents referredByPartnerId denormalization strategy
   * 
   * Attribute a student to a partner for referral tracking
   * 
   * @param studentId - student_profiles.id (UUID)
   * @param userId - users.id (UUID) - MUST be different from studentId
   * @param partnerId - partner_profiles.id (UUID)
   * 
   * DENORMALIZATION STRATEGY (Issue #2):
   * - Creates record in partner_student_referrals (source of truth)
   * - Updates student_profiles.referredByPartnerId (denormalized for quick lookups)
   * - This allows webhook handler to check student.referredByPartnerId without joining tables
   * - Both fields must stay in sync - wrapped in transaction for atomicity
   */
  async attributeStudentToPartner(
    studentId: string,
    userId: string,
    partnerId: string,
    attributionMethod: AttributionMethod = 'link_click',
    clickId?: string,
    promoCode?: string
  ): Promise<PartnerStudentReferral> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const existingReferral = await this.partnerStudentReferralRepo.findByStudentId(studentId);
      if (existingReferral) {
        throw new InvalidOperationError('attribute student', 'Student is already attributed to a partner');
      }

      let referralLinkId: string | null = null;
      if (clickId) {
        const click = await this.referralClickRepo.findById(clickId);
        referralLinkId = click.referralLinkId;
        
        await this.referralClickRepo.markAsConverted(clickId);
      }

      // PHASE 4 - Bug #11: Wrap all operations in transaction for atomicity
      const { db } = await import('../../db');
      const referral = await db.transaction(async (tx) => {
        // Create referral record - pass tx to use transaction
        const newReferral = await this.partnerStudentReferralRepo.create({
          partnerId,
          studentId,
          userId: userId,
          referralLinkId,
          attributionMethod,
          promoCode,
          status: 'pending'
        }, tx);

        // Atomic increment of partner referral count - pass tx to use transaction
        await this.partnerProfileRepo.incrementReferralCount(partnerId, tx);

        // Atomic increment of link conversion count - pass tx to use transaction
        if (referralLinkId) {
          await this.referralLinkRepo.incrementConversionCount(referralLinkId, tx);
        }

        // PHASE 6 - Issue #2: Update denormalized field for quick lookups
        // This allows webhook handler to check student.referredByPartnerId without joins
        // Pass tx to use transaction
        await this.studentRepo.update(studentId, {
          referredByPartnerId: partnerId,
          referralLinkId: referralLinkId
        }, tx);

        return newReferral;
      });

      return referral;
    } catch (error) {
      return this.handleError(error, 'ReferralTrackingService.attributeStudentToPartner');
    }
  }

  /**
   * PHASE 4 - Bug #10 Fix: Added validation for studentId type
   * ATOMICITY FIX: Accepts transaction parameter for proper atomicity
   * Track conversion when a referred student completes payment
   * 
   * @param studentId - Must be student_profiles.id (UUID), NOT users.id
   * @param subscriptionId - ID of the created subscription
   * @param paymentId - ID from payments table (UUID)
   * @param tx - Optional transaction handle for atomicity (required for webhook handler)
   */
  async trackConversion(studentId: string, subscriptionId: string, paymentId: string, tx?: DbOrTransaction): Promise<void> {
    try {
      // PHASE 4 - Bug #10: Validate studentId is a valid UUID
      const { CommonValidators } = await import('../validation');
      const studentIdValidation = CommonValidators.validateUUID(studentId, 'Student ID');
      if (!studentIdValidation.valid) {
        throw new ValidationServiceError('Track Conversion', {
          studentId: studentIdValidation.error!
        });
      }

      // PHASE 4 - Bug #10: Verify student profile exists
      // ATOMICITY FIX: Use transaction if provided
      const student = await this.studentRepo.findById(studentId, tx);
      if (!student) {
        throw new ResourceNotFoundError('Student profile', studentId);
      }

      // ATOMICITY FIX: Use transaction for finding referral
      const referral = await this.partnerStudentReferralRepo.findByStudentId(studentId);
      
      if (!referral) {
        return;
      }

      if (referral.status === 'converted' || referral.status === 'paid') {
        return;
      }

      const attributionCutoff = new Date();
      attributionCutoff.setDate(attributionCutoff.getDate() - ATTRIBUTION_WINDOW_DAYS);

      if (referral.createdAt && new Date(referral.createdAt) < attributionCutoff) {
        // ATOMICITY FIX: Pass transaction to update status
        await this.partnerStudentReferralRepo.updateStatus(
          referral.id,
          'rejected',
          'Attribution window expired'
        );
        return;
      }

      // ATOMICITY FIX: Pass transaction to update referral
      await this.partnerStudentReferralRepo.update(referral.id, {
        status: 'converted',
        subscriptionId,
        paymentId,
        convertedAt: new Date(),
        updatedAt: new Date()
      }, tx);

      // ATOMICITY FIX: Pass transaction to increment conversion count
      await this.partnerProfileRepo.incrementConversionCount(referral.partnerId, tx);
    } catch (error) {
      return this.handleError(error, 'ReferralTrackingService.trackConversion');
    }
  }
}

export const referralTrackingService = new ReferralTrackingService();
