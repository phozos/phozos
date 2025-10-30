import { useState } from 'react';

/**
 * OptimizedImage Component
 * 
 * A performance-optimized image component that provides:
 * - Lazy loading for better initial page load performance
 * - Async decoding to prevent blocking the main thread
 * - Error handling with optional fallback image
 * - Full TypeScript support
 * 
 * @example
 * ```tsx
 * <OptimizedImage 
 *   src="/path/to/image.jpg" 
 *   alt="Description of image"
 *   fallback="/path/to/placeholder.jpg"
 *   className="w-full h-auto"
 * />
 * ```
 * 
 * @remarks
 * This component automatically applies lazy loading and async decoding
 * to improve Core Web Vitals metrics (LCP, CLS). Consider setting explicit
 * width and height attributes to prevent layout shift.
 */

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** The source URL of the image */
  src: string;
  /** Alternative text for accessibility and SEO */
  alt: string;
  /** Optional fallback image URL if the primary image fails to load */
  fallback?: string;
}

/**
 * Renders an optimized image with lazy loading, async decoding, and error handling.
 * 
 * @param props - Image properties including src, alt, and optional fallback
 * @returns An optimized img element
 */
export function OptimizedImage({ src, alt, fallback, ...props }: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  const handleError = () => {
    if (fallback) {
      setImgSrc(fallback);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={handleError}
      {...props}
    />
  );
}
