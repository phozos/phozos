import { BaseService } from '../base.service';
import { IUserRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { jwtService } from '../../security/jwtService';
import { IAdminSecurityService } from './admin';
import * as bcrypt from 'bcrypt';
import { User } from '@shared/schema';
import {
  AuthenticationError
} from '../errors';
import { refreshTokenService } from './refresh-token.service';

export interface LoginStudentDTO {
  user: any;
  token: string;
  refreshToken: string;
  coolingPeriod: boolean;
  coolingPeriodEnds: Date | null;
}

export interface LoginTeamDTO {
  user: any;
  token: string;
  refreshToken: string;
}

export interface TeamLoginVisibilityDTO {
  visible: boolean;
}

export interface IAuthService {
  login(email: string, password: string, userType?: string): Promise<{ user: User }>;
  loginWithType(email: string, password: string, allowedTypes: string[]): Promise<{ user: User }>;
  loginStudentComplete(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<LoginStudentDTO>;
  loginTeamComplete(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<LoginTeamDTO>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null>;
  getTeamLoginVisibilityStatus(): Promise<TeamLoginVisibilityDTO>;
  validatePassword(userId: string, password: string): Promise<boolean>;
  getUserByEmail(email: string): Promise<User | undefined>;
  isInCoolingPeriod(user: User): boolean;
  getCoolingPeriodEnd(user: User): Date | null;
}

export class AuthService extends BaseService implements IAuthService {
  constructor(
    private userRepo: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  private get adminSecurityService(): IAdminSecurityService {
    return container.get<IAdminSecurityService>(TYPES.IAdminSecurityService);
  }

  async login(email: string, password: string, userType?: string): Promise<{ user: User }> {
    try {
      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (userType && user.userType !== userType) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (user.accountStatus === 'suspended') {
        throw new AuthenticationError('Account has been suspended', { userId: user.id });
      }

      if (user.accountStatus === 'pending_approval') {
        throw new AuthenticationError('Account is pending approval', { userId: user.id });
      }

      if (user.accountStatus === 'inactive') {
        throw new AuthenticationError('Account has been deactivated', { userId: user.id });
      }

      if (user.accountStatus === 'rejected') {
        throw new AuthenticationError('Account application was rejected', { userId: user.id });
      }

      if (user.accountStatus !== 'active') {
        throw new AuthenticationError('Account is not active', { userId: user.id });
      }

      if (!user.password) {
        throw new AuthenticationError('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid email or password');
      }

      await this.userRepo.update(user.id, { 
        lastLoginAt: new Date(),
        failedLoginAttempts: 0 
      });

      return { user: this.sanitizeUser(user) };
    } catch (error) {
      return this.handleError(error, 'AuthService.login');
    }
  }

  async loginWithType(email: string, password: string, allowedTypes: string[]): Promise<{ user: User }> {
    try {
      const user = await this.userRepo.findByEmail(email);
      if (!user || !allowedTypes.includes(user.userType)) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (user.accountStatus !== 'active') {
        const messages: Record<string, string> = {
          'suspended': 'Account has been suspended',
          'pending_approval': 'Account is pending approval',
          'inactive': 'Account has been deactivated',
          'rejected': 'Account application was rejected'
        };
        throw new AuthenticationError(
          messages[user.accountStatus || ''] || 'Account is not active', 
          { userId: user.id }
        );
      }

      if (!user.password) {
        throw new AuthenticationError('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid email or password');
      }

      await this.userRepo.update(user.id, { 
        lastLoginAt: new Date(),
        failedLoginAttempts: 0 
      });

      return { user: this.sanitizeUser(user) };
    } catch (error) {
      return this.handleError(error, 'AuthService.loginWithType');
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await this.userRepo.findByEmail(email);
      return user ? this.sanitizeUser(user) : undefined;
    } catch (error) {
      return this.handleError(error, 'AuthService.getUserByEmail');
    }
  }

  async validatePassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user || !user.password) {
        return false;
      }

      return await bcrypt.compare(password, user.password);
    } catch (error) {
      return this.handleError(error, 'AuthService.validatePassword');
    }
  }

  isInCoolingPeriod(user: User): boolean {
    if (!user.createdAt) return false;
    const createdAt = new Date(user.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation < 1 && user.userType === 'customer';
  }

  getCoolingPeriodEnd(user: User): Date | null {
    if (!user.createdAt || !this.isInCoolingPeriod(user)) {
      return null;
    }
    return new Date(new Date(user.createdAt).getTime() + 60 * 60 * 1000);
  }

  /**
   * Complete student login with JWT token and cooling period info
   * Handles all business logic including email normalization, authentication, token generation
   * Phase 2: Generates short-lived access token (15 min) and long-lived refresh token (30 days)
   */
  async loginStudentComplete(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<LoginStudentDTO> {
    try {
      const emailLower = email.toLowerCase();
      const result = await this.loginWithType(emailLower, password, ['customer', 'company_profile']);
      const user = result.user;

      const coolingPeriod = this.isInCoolingPeriod(user);
      const coolingPeriodEnds = this.getCoolingPeriodEnd(user);

      // Generate short-lived access token (15 minutes)
      const accessToken = jwtService.sign(
        { userId: user.id, userType: user.userType },
        { expiresIn: '15m', subject: user.id }
      );

      // Generate long-lived refresh token (30 days)
      const refreshToken = refreshTokenService.generateToken();
      await refreshTokenService.createRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

      const sanitizedUser = this.sanitizeUser(user);

      return {
        user: {
          ...sanitizedUser,
          token: accessToken
        },
        token: accessToken,
        refreshToken,
        coolingPeriod,
        coolingPeriodEnds
      };
    } catch (error) {
      return this.handleError(error, 'AuthService.loginStudentComplete');
    }
  }

  /**
   * Complete team login with JWT token
   * Handles all business logic including email normalization, authentication, token generation
   * Phase 2: Generates short-lived access token (15 min) and long-lived refresh token (30 days)
   */
  async loginTeamComplete(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<LoginTeamDTO> {
    try {
      const emailLower = email.toLowerCase();
      const result = await this.login(emailLower, password, 'team_member');
      const user = result.user;

      // Generate short-lived access token (15 minutes)
      const accessToken = jwtService.sign(
        { userId: user.id, userType: user.userType, teamRole: user.teamRole },
        { expiresIn: '15m', subject: user.id }
      );

      // Generate long-lived refresh token (30 days)
      const refreshToken = refreshTokenService.generateToken();
      await refreshTokenService.createRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

      const sanitizedUser = this.sanitizeUser(user);

      return {
        user: {
          ...sanitizedUser,
          token: accessToken
        },
        token: accessToken,
        refreshToken
      };
    } catch (error) {
      return this.handleError(error, 'AuthService.loginTeamComplete');
    }
  }

  /**
   * Refresh access token using refresh token rotation pattern
   * Phase 2: Implements token rotation for security
   * 
   * @param refreshToken - The refresh token to validate and rotate
   * @returns New access token and refresh token, or null if invalid
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      // Validate and rotate the refresh token
      const result = await refreshTokenService.validateAndRotate(refreshToken);

      if (!result) {
        return null;
      }

      // Get user data and verify account is still active
      const user = await this.userRepo.findById(result.userId);
      if (!user || user.accountStatus !== 'active') {
        return null;
      }

      // Generate new access token (15 minutes)
      const accessToken = jwtService.sign(
        { userId: user.id, userType: user.userType, teamRole: user.teamRole },
        { expiresIn: '15m', subject: user.id }
      );

      return {
        accessToken,
        refreshToken: result.newToken
      };
    } catch (error) {
      return this.handleError(error, 'AuthService.refreshAccessToken');
    }
  }

  /**
   * Get team login visibility status from admin settings
   */
  async getTeamLoginVisibilityStatus(): Promise<TeamLoginVisibilityDTO> {
    try {
      const settings = await this.adminSecurityService.getSecuritySettings();
      const teamLoginVisible = settings.find(s => s.settingKey === 'team_login_visible')?.settingValue === 'true';
      
      return { visible: teamLoginVisible };
    } catch (error) {
      return this.handleError(error, 'AuthService.getTeamLoginVisibilityStatus');
    }
  }
}

export const authService = new AuthService();
