import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  ogUrl?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterCreator?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleAuthor?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export function SEO({
  title = 'Phozos Study Abroad - Your Global Education Journey',
  description = 'Phozos helps students find and apply to universities worldwide with AI-powered matching, application tracking, and expert counseling.',
  keywords = 'study abroad, international education, university applications, student counseling, AI university matching',
  canonical,
  ogType = 'website',
  ogImage = '/og-image.png',
  ogUrl,
  ogImageWidth,
  ogImageHeight,
  ogImageAlt,
  twitterCard = 'summary_large_image',
  twitterCreator,
  articlePublishedTime,
  articleModifiedTime,
  articleAuthor,
  noindex = false,
  nofollow = false,
}: SEOProps) {
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://phozos.com';
  const fullUrl = ogUrl || canonical || baseUrl;
  const fullTitle = title.includes('Phozos') ? title : `${title} | Phozos Study Abroad`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={`${baseUrl}${canonical}`} />}
      
      {/* Robots */}
      {(noindex || nofollow) && (
        <meta 
          name="robots" 
          content={`${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`} 
        />
      )}
      
      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={`${baseUrl}${ogImage}`} />
      {ogImageWidth && <meta property="og:image:width" content={String(ogImageWidth)} />}
      {ogImageHeight && <meta property="og:image:height" content={String(ogImageHeight)} />}
      {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
      <meta property="og:site_name" content="Phozos Study Abroad" />
      <meta property="og:locale" content="en_US" />
      
      {/* Facebook-specific tags */}
      <meta property="fb:app_id" content="" />
      
      {/* Article-specific Open Graph tags */}
      {ogType === 'article' && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === 'article' && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      {ogType === 'article' && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
      )}
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@phozosofficial" />
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${baseUrl}${ogImage}`} />
      {ogImageAlt && <meta name="twitter:image:alt" content={ogImageAlt} />}
      
      {/* Language */}
      <html lang="en" />
      
      {/* Additional */}
      <meta name="author" content="Phozos Study Abroad" />
      <meta name="application-name" content="Phozos" />
    </Helmet>
  );
}
