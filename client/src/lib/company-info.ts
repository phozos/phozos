/**
 * Centralized Company Information
 * Single source of truth for corporate addresses and contact details
 */

export interface Address {
  street: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

export interface CompanyOffice {
  type: 'corporate' | 'registered';
  label: string;
  address: Address;
  abbreviated: string; // For compact displays like footer
  full: string; // For full displays
}

/**
 * Corporate Office (Headquarters)
 * Location: Mumbai, Maharashtra
 */
export const CORPORATE_OFFICE: CompanyOffice = {
  type: 'corporate',
  label: 'Corporate Office',
  address: {
    street: 'The Capital, G Block BKC',
    area: 'Bandra Kurla Complex, Bandra East',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400051',
    country: 'India',
    countryCode: 'IN'
  },
  abbreviated: 'Mumbai, Maharashtra',
  full: 'The Capital, G Block BKC, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051, India'
};

/**
 * Registered Office
 * Location: Bathinda, Punjab
 */
export const REGISTERED_OFFICE: CompanyOffice = {
  type: 'registered',
  label: 'Registered Office',
  address: {
    street: '',
    area: '',
    city: 'Bathinda',
    state: 'Punjab',
    postalCode: '',
    country: 'India',
    countryCode: 'IN'
  },
  abbreviated: 'Bathinda, Punjab',
  full: 'Bathinda, Punjab, India'
};

/**
 * All company offices
 */
export const COMPANY_OFFICES = [CORPORATE_OFFICE, REGISTERED_OFFICE] as const;

/**
 * Company contact information
 */
export const COMPANY_INFO = {
  name: 'Phozos',
  description: 'Study Abroad Platform',
  offices: COMPANY_OFFICES,
  corporateOffice: CORPORATE_OFFICE,
  registeredOffice: REGISTERED_OFFICE
} as const;
