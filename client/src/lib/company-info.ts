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
  type: 'corporate' | 'registered' | 'us';
  label: string;
  address: Address;
  abbreviated: string; // For compact displays like footer
  full: string; // For full displays
  phone?: string; // Optional phone number
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
 * United States Office
 * Location: San Francisco, California
 */
export const US_OFFICE: CompanyOffice = {
  type: 'us',
  label: 'United States Office',
  address: {
    street: 'Salesforce Tower, 415 Mission Street',
    area: '',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'United States',
    countryCode: 'US'
  },
  abbreviated: 'San Francisco, CA',
  full: 'Salesforce Tower, 415 Mission Street, San Francisco, CA 94105, United States',
  phone: '+1 (201) 276-4555'
};

/**
 * All company offices
 */
export const COMPANY_OFFICES = [CORPORATE_OFFICE, REGISTERED_OFFICE, US_OFFICE] as const;

/**
 * Company contact information
 */
export const COMPANY_INFO = {
  name: 'Phozos',
  description: 'Study Abroad Platform',
  offices: COMPANY_OFFICES,
  corporateOffice: CORPORATE_OFFICE,
  registeredOffice: REGISTERED_OFFICE,
  usOffice: US_OFFICE
} as const;
