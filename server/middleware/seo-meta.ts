import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { featuresConfig } from '../config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MetaTemplate {
  title: string;
  description: string;
  keywords?: string;
  noindex?: boolean;
  ogImage?: string;
}

// SEO meta tags for each route - matches docs/SEO_META_TAGS.md
const metaTemplates: Record<string, MetaTemplate> = {
  '/': {
    title: 'Phozos Study Abroad - Your Global Education Journey',
    description: 'Discover universities worldwide with AI-powered matching, expert counseling, and comprehensive application tracking. Join 50,000+ students achieving their study abroad dreams.',
    keywords: 'study abroad, international education, university applications, AI university matching, student counseling, global education',
    ogImage: '/og-home.png',
  },
  '/plans': {
    title: 'Subscription Plans - Phozos Study Abroad',
    description: 'Choose the perfect plan for your study abroad journey. From Explorer to Legend, unlock universities worldwide with premium features and expert support.',
    keywords: 'phozos plans, study abroad subscription, university application plans, student pricing',
    ogImage: '/og-plans.png',
  },
  '/about': {
    title: 'About Us - Phozos Study Abroad',
    description: 'Learn about Phozos\' mission to make international education accessible to students worldwide through technology and expert counseling.',
    keywords: 'about phozos, study abroad company, education technology, international student services',
  },
  '/privacy-policy': {
    title: 'Privacy Policy - Phozos Study Abroad',
    description: 'Read Phozos Study Abroad\'s privacy policy to understand how we collect, use, and protect your personal information in compliance with GDPR, CCPA, and international privacy laws.',
  },
  '/terms-of-service': {
    title: 'Terms of Service - Phozos Study Abroad',
    description: 'Read the Terms of Service for Phozos Study Abroad platform. Understand your rights and responsibilities when using our international education services.',
  },
  '/cookie-policy': {
    title: 'Cookie Policy - Phozos Study Abroad',
    description: 'Learn how Phozos Study Abroad uses cookies and similar tracking technologies to improve your experience and provide personalized services.',
  },
  '/contact': {
    title: 'Contact Us - Phozos Study Abroad',
    description: 'Get in touch with Phozos Study Abroad team. We\'re here to answer your questions about international education and university applications.',
    keywords: 'contact phozos, study abroad support, education counseling contact',
  },
  '/faq': {
    title: 'FAQs - Phozos Study Abroad',
    description: 'Frequently asked questions about Phozos Study Abroad services, university applications, subscription plans, and international education process.',
    keywords: 'study abroad faq, university application questions, phozos help',
  },
  '/auth': {
    title: 'Login & Sign Up - Phozos Study Abroad',
    description: 'Access your Phozos account to manage university applications, track your progress, and connect with education counselors.',
    noindex: true,
  },
  '/not-found': {
    title: 'Page Not Found - Phozos Study Abroad',
    description: 'The page you\'re looking for doesn\'t exist. Return to our homepage to continue your study abroad journey.',
    noindex: true,
  },
};

let indexHtmlCache: string | null = null;

/**
 * Server-side SEO meta tag injection middleware
 * Injects page-specific meta tags for better SEO without full prerendering
 */
export function injectSEOMeta(req: Request, res: Response, next: NextFunction) {
  // Only handle HTML requests (not API or assets)
  if (!req.accepts('html')) {
    return next();
  }

  const originalUrl = req.path; // Use path instead of originalUrl to avoid query params
  const meta = metaTemplates[originalUrl];

  // Only inject for known routes with meta templates
  if (meta && featuresConfig.SEO_META_ENABLED) {
    try {
      // Load and cache index.html
      if (!indexHtmlCache) {
        const htmlPath = path.resolve(__dirname, '..', '..', 'dist', 'public', 'index.html');
        indexHtmlCache = fs.readFileSync(htmlPath, 'utf-8');
      }

      let html = indexHtmlCache;
      const baseUrl = process.env.BASE_URL || 'https://phozos.com';

      // Replace title
      html = html.replace(
        /<title>.*?<\/title>/,
        `<title>${meta.title}</title>`
      );

      // Replace description
      html = html.replace(
        /<meta name="description" content=".*?"\/>/,
        `<meta name="description" content="${meta.description}"/>`
      );

      // Add keywords if present
      if (meta.keywords) {
        const keywordsTag = `<meta name="keywords" content="${meta.keywords}"/>`;
        html = html.replace('</head>', `  ${keywordsTag}\n  </head>`);
      }

      // Add noindex if needed
      if (meta.noindex) {
        const robotsTag = '<meta name="robots" content="noindex,nofollow"/>';
        html = html.replace('</head>', `  ${robotsTag}\n  </head>`);
      }

      // Add/update Open Graph tags
      const ogTitle = `<meta property="og:title" content="${meta.title}"/>`;
      const ogDescription = `<meta property="og:description" content="${meta.description}"/>`;
      const ogUrl = `<meta property="og:url" content="${baseUrl}${originalUrl}"/>`;
      const ogImage = meta.ogImage 
        ? `<meta property="og:image" content="${baseUrl}${meta.ogImage}"/>`
        : `<meta property="og:image" content="${baseUrl}/og-default.png"/>`;

      // Inject OG tags before </head>
      const ogTags = `  ${ogTitle}\n  ${ogDescription}\n  ${ogUrl}\n  ${ogImage}\n  <meta property="og:type" content="website"/>\n  <meta property="og:site_name" content="Phozos Study Abroad"/>`;
      html = html.replace('</head>', `${ogTags}\n  </head>`);

      // Add canonical URL
      const canonicalTag = `<link rel="canonical" href="${baseUrl}${originalUrl}"/>`;
      html = html.replace('</head>', `  ${canonicalTag}\n  </head>`);

      // Send modified HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('SEO meta injection error:', error);
      // Fall through to serve regular file on error
      next();
    }
  } else {
    // For routes without meta templates or in development, serve normally
    next();
  }
}

// Clear cache on module reload (development)
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    indexHtmlCache = null;
  });
}
