import { BaseService } from '../base.service';
import {
  IPartnerProfileRepository,
  IPartnerReferralLinkRepository,
  IReferralClickRepository
} from '../../repositories';
import { container, TYPES } from '../container';
import { PartnerReferralLink } from '@shared/schema';
import {
  CreateReferralLinkRequest,
  ReferralLinkCreatedResponse,
  ReferralLinkWithStats,
  LINK_CODE_LENGTH
} from '@shared/types/partner-types';
import { ValidationServiceError, InvalidOperationError } from '../errors';

export interface IReferralLinkService {
  createReferralLink(partnerId: string, data: CreateReferralLinkRequest): Promise<ReferralLinkCreatedResponse>;
  getReferralLinks(partnerId: string): Promise<ReferralLinkWithStats[]>;
  updateReferralLink(linkId: string, updates: Partial<PartnerReferralLink>): Promise<PartnerReferralLink>;
  deactivateReferralLink(linkId: string): Promise<void>;
  generateDefaultReferralLink(partnerId: string): Promise<PartnerReferralLink>;
}

export class ReferralLinkService extends BaseService implements IReferralLinkService {
  constructor(
    private partnerProfileRepo: IPartnerProfileRepository = container.get<IPartnerProfileRepository>(TYPES.IPartnerProfileRepository),
    private referralLinkRepo: IPartnerReferralLinkRepository = container.get<IPartnerReferralLinkRepository>(TYPES.IPartnerReferralLinkRepository),
    private referralClickRepo: IReferralClickRepository = container.get<IReferralClickRepository>(TYPES.IReferralClickRepository)
  ) {
    super();
  }

  async createReferralLink(partnerId: string, data: CreateReferralLinkRequest): Promise<ReferralLinkCreatedResponse> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const errors: Record<string, string> = {};

      if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
        errors.expiresAt = 'Expiration date must be in the future';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Referral Link', errors);
      }

      const linkCode = await this.referralLinkRepo.generateUniqueLinkCode(LINK_CODE_LENGTH);
      const linkUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/register?ref=${linkCode}`;

      const link = await this.referralLinkRepo.create({
        partnerId,
        linkCode,
        linkUrl,
        campaignName: data.campaignName || `Campaign-${linkCode}`,
        campaignSource: data.campaignSource,
        campaignMedium: data.campaignMedium,
        description: data.description,
        expiresAt: data.expiresAt,
        isActive: true
      });

      const fullUrl = linkUrl;

      return {
        link,
        fullUrl
      };
    } catch (error) {
      return this.handleError(error, 'ReferralLinkService.createReferralLink');
    }
  }

  async getReferralLinks(partnerId: string): Promise<ReferralLinkWithStats[]> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const links = await this.referralLinkRepo.findByPartnerId(partnerId);

      const linksWithStats = await Promise.all(
        links.map(async (link) => {
          const clicks = await this.referralClickRepo.findByReferralLinkId(link.id);

          const uniqueClicks = new Set(clicks.map(c => c.fingerprint)).size;
          const conversions = clicks.filter(c => c.convertedToRegistration).length;

          return {
            ...link,
            clickCount: clicks.length,
            uniqueClickCount: uniqueClicks,
            conversionCount: conversions,
            conversionRate: clicks.length > 0 ? (conversions / clicks.length) * 100 : 0,
            lastClickedAt: clicks.length > 0 ? clicks[0].clickedAt : null
          };
        })
      );

      return linksWithStats;
    } catch (error) {
      return this.handleError(error, 'ReferralLinkService.getReferralLinks');
    }
  }

  async updateReferralLink(linkId: string, updates: Partial<PartnerReferralLink>): Promise<PartnerReferralLink> {
    try {
      const link = await this.referralLinkRepo.findById(linkId);

      const updateData: Partial<PartnerReferralLink> = {};

      if (updates.campaignName !== undefined) {
        updateData.campaignName = updates.campaignName;
      }

      if (updates.campaignSource !== undefined) {
        updateData.campaignSource = updates.campaignSource;
      }

      if (updates.campaignMedium !== undefined) {
        updateData.campaignMedium = updates.campaignMedium;
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      if (updates.expiresAt !== undefined) {
        if (updates.expiresAt && new Date(updates.expiresAt) <= new Date()) {
          throw new ValidationServiceError('Referral Link', {
            expiresAt: 'Expiration date must be in the future'
          });
        }
        updateData.expiresAt = updates.expiresAt;
      }

      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
      }

      updateData.updatedAt = new Date();

      return await this.referralLinkRepo.update(linkId, updateData);
    } catch (error) {
      return this.handleError(error, 'ReferralLinkService.updateReferralLink');
    }
  }

  async deactivateReferralLink(linkId: string): Promise<void> {
    try {
      const link = await this.referralLinkRepo.findById(linkId);

      if (!link.isActive) {
        throw new InvalidOperationError('deactivate referral link', 'Link is already inactive');
      }

      await this.referralLinkRepo.update(linkId, {
        isActive: false,
        updatedAt: new Date()
      });
    } catch (error) {
      return this.handleError(error, 'ReferralLinkService.deactivateReferralLink');
    }
  }

  async generateDefaultReferralLink(partnerId: string): Promise<PartnerReferralLink> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const existingLinks = await this.referralLinkRepo.findByPartnerId(partnerId);
      const defaultLink = existingLinks.find(link => link.campaignName === 'Default');

      if (defaultLink) {
        return defaultLink;
      }

      const linkCode = await this.referralLinkRepo.generateUniqueLinkCode(LINK_CODE_LENGTH);
      const linkUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/register?ref=${linkCode}`;

      return await this.referralLinkRepo.create({
        partnerId,
        linkCode,
        linkUrl,
        campaignName: 'Default',
        isActive: true
      });
    } catch (error) {
      return this.handleError(error, 'ReferralLinkService.generateDefaultReferralLink');
    }
  }
}

export const referralLinkService = new ReferralLinkService();
