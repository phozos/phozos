import { Helmet } from 'react-helmet-async';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface StructuredDataProps {
  type?: 'organization' | 'website' | 'breadcrumb' | 'faq' | 'all';
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
}

export function StructuredData({
  type = 'all',
  breadcrumbs = [],
  faqs = [],
}: StructuredDataProps) {
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://phozos.com';

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Phozos Study Abroad",
    "alternateName": "Phozos",
    "url": baseUrl,
    "logo": `${baseUrl}/android-chrome-512x512.png`,
    "description": "Phozos helps students find and apply to universities worldwide with AI-powered matching, application tracking, and expert counseling.",
    "email": "hey@phozos.com",
    "telephone": "+91-7526951566",
    "address": [
      {
        "@type": "PostalAddress",
        "addressLocality": "Bengaluru",
        "addressRegion": "Karnataka",
        "addressCountry": "IN",
        "name": "Corporate Office",
        "description": "Koramangala, Bengaluru, Karnataka, India"
      },
      {
        "@type": "PostalAddress",
        "addressLocality": "Bathinda",
        "addressRegion": "Punjab",
        "addressCountry": "IN",
        "name": "Registered Office",
        "description": "Bathinda, Punjab, India"
      }
    ],
    "areaServed": {
      "@type": "Place",
      "name": "Worldwide"
    },
    "sameAs": [
      "https://www.facebook.com/phozos",
      "https://www.instagram.com/phozosofficial",
      "https://www.twitter.com/phozosofficial"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-7526951566",
      "email": "hey@phozos.com",
      "contactType": "Customer Service",
      "areaServed": "Worldwide",
      "availableLanguage": ["English"]
    },
    "founder": {
      "@type": "Organization",
      "name": "Phozos Study Abroad"
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Phozos Study Abroad",
    "url": baseUrl,
    "description": "Your Global Education Journey - Find and apply to universities worldwide",
    "publisher": {
      "@type": "EducationalOrganization",
      "name": "Phozos Study Abroad",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/android-chrome-512x512.png`
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/universities?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const breadcrumbSchema = breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": `${baseUrl}${crumb.url}`
    }))
  } : null;

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  const shouldShowOrganization = type === 'all' || type === 'organization';
  const shouldShowWebsite = type === 'all' || type === 'website';
  const shouldShowBreadcrumb = (type === 'all' || type === 'breadcrumb') && breadcrumbSchema;
  const shouldShowFAQ = (type === 'all' || type === 'faq') && faqSchema;

  return (
    <Helmet>
      {shouldShowOrganization && (
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      )}
      
      {shouldShowWebsite && (
        <script type="application/ld+json">
          {JSON.stringify(websiteSchema)}
        </script>
      )}
      
      {shouldShowBreadcrumb && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      
      {shouldShowFAQ && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  );
}

export function OrganizationSchema() {
  return <StructuredData type="organization" />;
}

export function WebsiteSchema() {
  return <StructuredData type="website" />;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  return <StructuredData type="breadcrumb" breadcrumbs={items} />;
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  return <StructuredData type="faq" faqs={items} />;
}
