import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/StructuredData';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function CookiePolicy() {
  return (
    <>
      <SEO
        title="Cookie Policy - Phozos Study Abroad"
        description="Learn about how Phozos Study Abroad uses cookies and similar technologies to improve your experience and analyze site usage."
        canonical="/cookie-policy"
      />
      <BreadcrumbSchema items={[
        { name: "Home", url: "/" },
        { name: "Cookie Policy", url: "/cookie-policy" }
      ]} />
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
          <h1 className="text-4xl font-bold text-foreground mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">
            Last Updated: October 26, 2025
          </p>
          
          <div className="prose dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">What Are Cookies?</h2>
              <p>
                Cookies are small text files stored on your device when you visit our website.
                They help us provide a better user experience and analyze how our site is used.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold mb-2">Essential Cookies</h3>
              <p>Required for the website to function properly. Cannot be disabled.</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Authentication:</strong> Keep you logged in</li>
                <li><strong>Security:</strong> CSRF protection, session management</li>
                <li><strong>Preferences:</strong> Language, theme settings</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-2">Analytics Cookies</h3>
              <p>Help us understand how visitors use our site.</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Google Analytics:</strong> Traffic analysis, user behavior</li>
                <li><strong>Hotjar:</strong> Heatmaps, session recordings (with consent)</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-2">Marketing Cookies</h3>
              <p>Used to track visitors across websites for advertising purposes.</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Google Ads:</strong> Remarketing campaigns</li>
                <li><strong>Facebook Pixel:</strong> Ad targeting and measurement</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Cookie List</h2>
              <table className="min-w-full border">
                <thead>
                  <tr>
                    <th className="border p-2">Cookie Name</th>
                    <th className="border p-2">Purpose</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">phozos_session</td>
                    <td className="border p-2">User authentication</td>
                    <td className="border p-2">Essential</td>
                    <td className="border p-2">Session</td>
                  </tr>
                  <tr>
                    <td className="border p-2">phozos_cookie_consent</td>
                    <td className="border p-2">Cookie consent status</td>
                    <td className="border p-2">Essential</td>
                    <td className="border p-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="border p-2">_ga</td>
                    <td className="border p-2">Google Analytics user ID</td>
                    <td className="border p-2">Analytics</td>
                    <td className="border p-2">2 years</td>
                  </tr>
                  <tr>
                    <td className="border p-2">_gid</td>
                    <td className="border p-2">Google Analytics session ID</td>
                    <td className="border p-2">Analytics</td>
                    <td className="border p-2">24 hours</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Managing Cookies</h2>
              <p>
                You can control cookies through:
              </p>
              <ul className="list-disc pl-6">
                <li><strong>Our Cookie Banner:</strong> Accept or reject non-essential cookies</li>
                <li><strong>Browser Settings:</strong> Block or delete cookies in your browser preferences</li>
                <li><strong>Opt-Out Tools:</strong> <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out</a></li>
              </ul>
              <p className="mt-4">
                Note: Blocking essential cookies may affect website functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p>
                Questions about our cookie use? Contact us at:{' '}
                <a href="mailto:hey@phozos.com" className="text-primary hover:underline">hey@phozos.com</a>
              </p>
            </section>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
