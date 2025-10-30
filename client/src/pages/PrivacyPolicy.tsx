import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/StructuredData';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <>
      <SEO
        title="Privacy Policy - Phozos Study Abroad"
        description="Read Phozos Study Abroad's privacy policy to understand how we collect, use, and protect your personal information in compliance with GDPR, CCPA, and international privacy laws."
        canonical="/privacy-policy"
      />
      <BreadcrumbSchema items={[
        { name: "Home", url: "/" },
        { name: "Privacy Policy", url: "/privacy-policy" }
      ]} />
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">
            Last Updated: October 26, 2025
          </p>
          
          <div className="prose dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                Phozos Study Abroad ("we," "our," or "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our website and services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-2">2.1 Personal Information</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Name, email address, phone number</li>
                <li>Date of birth, nationality</li>
                <li>Educational background and transcripts</li>
                <li>Test scores (SAT, ACT, TOEFL, IELTS, etc.)</li>
                <li>Payment information (processed securely through Stripe)</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-2">2.2 Usage Information</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>IP address, browser type, device information</li>
                <li>Pages visited, time spent on pages</li>
                <li>Referral sources</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6">
                <li>Provide university matching and application services</li>
                <li>Process payments and manage subscriptions</li>
                <li>Communicate with you about your applications</li>
                <li>Improve our services and user experience</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and ensure security</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
              <p>We may share your information with:</p>
              <ul className="list-disc pl-6">
                <li><strong>Universities:</strong> When you submit applications</li>
                <li><strong>Service Providers:</strong> Payment processors, email services, analytics</li>
                <li><strong>Legal Authorities:</strong> When required by law</li>
              </ul>
              <p className="mt-4">
                <strong>We never sell your personal information to third parties.</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights (GDPR/CCPA)</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us at: <a href="mailto:hey@phozos.com" className="text-primary hover:underline">hey@phozos.com</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
              <p>
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Encrypted database storage</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
              <p>
                We use cookies for:
              </p>
              <ul className="list-disc pl-6">
                <li><strong>Essential:</strong> Authentication, security</li>
                <li><strong>Functional:</strong> User preferences, language settings</li>
                <li><strong>Analytics:</strong> Google Analytics (anonymized)</li>
                <li><strong>Marketing:</strong> With your consent</li>
              </ul>
              <p className="mt-4">
                You can manage cookies in your browser settings or through our <a href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
              <p>
                Our services are intended for users 13 years and older. We do not knowingly collect
                information from children under 13. If you believe we have collected such information,
                please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own.
                We ensure appropriate safeguards are in place, including Standard Contractual Clauses
                approved by the European Commission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services
                and comply with legal obligations. Typically:
              </p>
              <ul className="list-disc pl-6">
                <li>Active accounts: Duration of subscription + 2 years</li>
                <li>Application data: 7 years (regulatory requirement)</li>
                <li>Marketing data: Until consent is withdrawn</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant
                changes by email or prominent notice on our website. Continued use of our services
                after changes constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
              <p>
                For privacy-related questions or concerns:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> <a href="mailto:hey@phozos.com" className="text-primary hover:underline">hey@phozos.com</a><br />
                <strong>Address:</strong> Phozos Study Abroad Platform<br />
                <strong>Data Protection Officer:</strong> hey@phozos.com
              </p>
            </section>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
