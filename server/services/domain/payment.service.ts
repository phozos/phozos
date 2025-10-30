import { BaseService } from '../base.service';
import { IPaymentRepository } from '../../repositories';
import { PaymentSettings } from '@shared/schema';
import { container, TYPES } from '../container';
import { InvalidOperationError, ValidationServiceError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

export interface IPaymentService {
  getPaymentSettings(): Promise<PaymentSettings[]>;
  getActivePaymentSettings(): Promise<PaymentSettings[]>;
  updatePaymentSettings(gateway: string, configuration: any, updatedBy: string): Promise<PaymentSettings>;
  togglePaymentGateway(gateway: string, isActive: boolean, updatedBy: string): Promise<PaymentSettings | undefined>;
}

export class PaymentService extends BaseService implements IPaymentService {
  constructor(
    private paymentRepository: IPaymentRepository = container.get<IPaymentRepository>(TYPES.IPaymentRepository)
  ) {
    super();
  }

  async getPaymentSettings(): Promise<PaymentSettings[]> {
    try {
      return await this.paymentRepository.findAll();
    } catch (error) {
      return this.handleError(error, 'PaymentService.getPaymentSettings');
    }
  }

  async getActivePaymentSettings(): Promise<PaymentSettings[]> {
    try {
      return await this.paymentRepository.findActive();
    } catch (error) {
      return this.handleError(error, 'PaymentService.getActivePaymentSettings');
    }
  }

  async updatePaymentSettings(gateway: string, configuration: any, updatedBy: string): Promise<PaymentSettings> {
    try {
      const errors: Record<string, string> = {};

      const gatewayValidation = CommonValidators.validateStringLength(gateway, 1, 100, 'Gateway name');
      if (!gatewayValidation.valid) {
        errors.gateway = gatewayValidation.error!;
      }

      const updatedByValidation = CommonValidators.validateUUID(updatedBy, 'Updated by user ID');
      if (!updatedByValidation.valid) {
        errors.updatedBy = updatedByValidation.error!;
      }

      if (!configuration || typeof configuration !== 'object') {
        errors.configuration = 'Configuration must be a valid object';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Payment Settings', errors);
      }

      const existing = await this.paymentRepository.findByGateway(gateway);

      if (existing) {
        const result = await this.paymentRepository.updateByGateway(gateway, {
          configuration,
          updatedBy,
          updatedAt: new Date()
        });
        if (!result) {
          throw new InvalidOperationError('update payment settings', 'Payment settings update failed');
        }
        return result;
      } else {
        return await this.paymentRepository.create({
          gateway,
          configuration,
          updatedBy,
          isActive: false
        });
      }
    } catch (error) {
      return this.handleError(error, 'PaymentService.updatePaymentSettings');
    }
  }

  async togglePaymentGateway(gateway: string, isActive: boolean, updatedBy: string): Promise<PaymentSettings | undefined> {
    try {
      return await this.paymentRepository.updateByGateway(gateway, {
        isActive,
        updatedBy,
        updatedAt: new Date()
      });
    } catch (error) {
      return this.handleError(error, 'PaymentService.togglePaymentGateway');
    }
  }
}

export const paymentService = new PaymentService();
