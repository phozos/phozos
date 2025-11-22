import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IReferralTrackingService } from '../services/domain/referral-tracking.service';
import crypto from 'crypto';
import logger from '../utils/logger';

/**
 * Public Referral Controller
 * 
 * Handles public-facing referral link clicks (NO authentication required).
 * 
 * Phase 6.1: Referral Tracking System
 * - Processes GET /ref/:linkCode endpoint
 * - Records click metadata and generates fingerprints
 * - Sets attribution cookies for later registration attribution
 * - Redirects to registration page
 */
export class PublicReferralController extends BaseController {
  /**
   * Handle referral link click
   * 
   * @route GET /ref/:linkCode
   * @access Public (NO authentication required)
   * 
   * Logic:
   * 1. Extract linkCode from URL parameter
   * 2. Look up referral link in database
   * 3. Collect metadata (IP, User-Agent, Referer)
   * 4. Generate/retrieve session ID (30-day cookie)
   * 5. Generate fingerprint: SHA256(IP + User-Agent)
   * 6. Check if unique click (by fingerprint + linkId)
   * 7. Record click in referral_clicks table
   * 8. Set cookies: referral_code (httpOnly: false), click_id (httpOnly: true), ref_session
   * 9. Redirect to /auth?signup=true&ref=LINKCODE
   */
  async handleReferralClick(req: Request, res: Response) {
    try {
      const { linkCode } = req.params;
      
      logger.info('Referral link clicked', { linkCode });
      
      // Collect metadata
      const ipAddress = req.ip || '0.0.0.0';
      const userAgent = req.get('User-Agent') || '';
      const referer = req.get('Referer') || '';
      
      // Generate or retrieve session ID (30-day cookie)
      let sessionId = req.cookies['ref_session'];
      if (!sessionId) {
        sessionId = crypto.randomBytes(32).toString('hex');
        res.cookie('ref_session', sessionId, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      
      // Get tracking service
      const trackingService = getService<IReferralTrackingService>(TYPES.IReferralTrackingService);
      
      // Generate fingerprint using service method
      const fingerprint = trackingService.getFingerprintFromRequest(ipAddress, userAgent);
      
      // Record click
      const click = await trackingService.recordClick({
        linkCode,
        ipAddress,
        userAgent,
        referer,
        sessionId,
        fingerprint
      });
      
      logger.info('Referral click recorded', {
        clickId: click.id,
        linkCode,
        isUnique: click.isUnique,
        fingerprint
      });
      
      // Set attribution cookies
      // referral_code: readable by frontend for display purposes
      res.cookie('referral_code', linkCode, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: false, // Need to read from frontend
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // click_id: httpOnly for security, used for attribution
      res.cookie('click_id', click.id, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true, // Secure from XSS
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Redirect to auth page with signup mode and referral code as query parameters
      return res.redirect(`/auth?signup=true&ref=${linkCode}`);
      
    } catch (error) {
      // Log error but don't expose details to user
      logger.error('Referral tracking error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        linkCode: req.params.linkCode
      });
      
      // Redirect to home page on error (fail gracefully)
      return res.redirect('/');
    }
  }
}

export const publicReferralController = new PublicReferralController();
