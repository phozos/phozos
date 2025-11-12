import { BaseService } from '../base.service';
import {
  IPartnerReferralLinkRepository,
  IReferralClickRepository,
  IPartnerStudentReferralRepository,
  IPartnerProfileRepository,
  IPaymentRepository
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
  attributeStudentToPartner(studentId: string, partnerId: string, attributionMethod: AttributionMethod, clickId?: string, promoCode?: string): Promise<PartnerStudentReferral>;
  trackConversion(studentId: string, subscriptionId: string, paymentId: string): Promise<void>;
  isUniqueClick(fingerprint: string, linkId: string): Promise<boolean>;
  getFingerprintFromRequest(ipAddress: string, userAgent: string): string;
}

export class ReferralTrackingService extends BaseService implements IReferralTrackingService {
  constructor(
    private referralLinkRepo: IPartnerReferralLinkRepository = container.get<IPartnerReferralLinkRepository>(TYPES.IPartnerReferralLinkRepository),
    private referralClickRepo: IReferralClickRepository = container.get<IReferralClickRepository>(TYPES.IReferralClickRepository),
    private partnerStudentReferralRepo: IPartnerStudentReferralRepository = container.get<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository),
    private partnerProfileRepo: IPartnerProfileRepository = container.get<IPartnerProfileRepository>(TYPES.IPartnerProfileRepository),
    private paymentRepo: IPaymentRepository = container.get<IPaymentRepository>(TYPES.IPaymentRepository)
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

  async attributeStudentToPartner(
    studentId: string,
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

      const referral = await this.partnerStudentReferralRepo.create({
        partnerId,
        studentId,
        userId: studentId,
        referralLinkId,
        attributionMethod,
        promoCode,
        status: 'pending'
      });

      await this.partnerProfileRepo.incrementReferralCount(partnerId);

      if (referralLinkId) {
        await this.referralLinkRepo.incrementConversionCount(referralLinkId);
      }

      return referral;
    } catch (error) {
      return this.handleError(error, 'ReferralTrackingService.attributeStudentToPartner');
    }
  }

  async trackConversion(studentId: string, subscriptionId: string, paymentId: string): Promise<void> {
    try {
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
        await this.partnerStudentReferralRepo.updateStatus(
          referral.id,
          'rejected',
          'Attribution window expired'
        );
        return;
      }

      await this.partnerStudentReferralRepo.update(referral.id, {
        status: 'converted',
        subscriptionId,
        paymentId,
        convertedAt: new Date(),
        updatedAt: new Date()
      });

      await this.partnerProfileRepo.incrementConversionCount(referral.partnerId);
    } catch (error) {
      return this.handleError(error, 'ReferralTrackingService.trackConversion');
    }
  }
}

export const referralTrackingService = new ReferralTrackingService();
