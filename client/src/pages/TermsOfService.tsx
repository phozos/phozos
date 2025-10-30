import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/StructuredData';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function TermsOfService() {
  return (
    <>
      <SEO
        title="Terms of Service - Phozos Study Abroad"
        description="Read the Terms of Service for Phozos Study Abroad platform. Understand your rights and responsibilities when using our international education services."
        canonical="/terms-of-service"
      />
      <BreadcrumbSchema items={[
        { name: "Home", url: "/" },
        { name: "Terms of Service", url: "/terms-of-service" }
      ]} />
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Last Updated: October 26, 2025
          </p>
          
          <div className="prose dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Phozos Study Abroad ("Phozos," "we," "our," or "us"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
              <p className="mt-4">
                These terms apply to all users, including students, counselors, university partners, and visitors to our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Services</h2>
              <p>
                Phozos provides an international education platform that offers:
              </p>
              <ul className="list-disc pl-6">
                <li>AI-powered university matching and recommendations</li>
                <li>Application tracking and management tools</li>
                <li>Expert counseling services</li>
                <li>University database and information resources</li>
                <li>Community forums for students</li>
                <li>Document management and storage</li>
              </ul>
              <p className="mt-4">
                Our services are designed to assist students in their study abroad journey but do not guarantee admission to any university.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
              <h3 className="text-xl font-semibold mb-2">3.1 Account Creation</h3>
              <p>
                To access certain features, you must create an account by providing accurate, current, and complete information. You are responsible for:
              </p>
              <ul className="list-disc pl-6">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">3.2 Account Eligibility</h3>
              <p>
                You must be at least 13 years old to create an account. Users under 18 should have parental or guardian consent.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">3.3 Account Termination</h3>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent, abusive, or illegal activities.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payment Terms</h2>
              <h3 className="text-xl font-semibold mb-2">4.1 Subscription Plans</h3>
              <p>
                Phozos offers various subscription plans with different features and pricing. Current pricing is available on our Plans page.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">4.2 Billing</h3>
              <ul className="list-disc pl-6">
                <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>Prices may change with 30 days notice to existing subscribers</li>
                <li>You authorize us to charge your payment method for recurring fees</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">4.3 Cancellation</h3>
              <p>
                You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period. No refunds will be provided for partial billing periods.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities and Conduct</h2>
              <p>
                You agree to use Phozos responsibly and not to:
              </p>
              <ul className="list-disc pl-6">
                <li>Provide false, inaccurate, or misleading information</li>
                <li>Impersonate any person or entity</li>
                <li>Violate any laws or regulations</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Upload malicious code or viruses</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use our services for spam or commercial solicitation</li>
                <li>Scrape or collect data without permission</li>
                <li>Share account credentials with others</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property Rights</h2>
              <h3 className="text-xl font-semibold mb-2">6.1 Phozos Content</h3>
              <p>
                All content on Phozos, including text, graphics, logos, software, and design, is owned by Phozos or our licensors and protected by copyright, trademark, and other intellectual property laws.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">6.2 User Content</h3>
              <p>
                You retain ownership of content you upload (documents, profile information, forum posts). By uploading content, you grant Phozos a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content as necessary to provide our services.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">6.3 Restrictions</h3>
              <p>
                You may not reproduce, distribute, modify, or create derivative works from Phozos content without our express written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Disclaimers and Limitations of Liability</h2>
              <h3 className="text-xl font-semibold mb-2">7.1 No Guarantee of Admission</h3>
              <p>
                Phozos does not guarantee admission to any university. University admissions decisions are made independently by each institution.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">7.2 Service Availability</h3>
              <p>
                Our services are provided "as is" without warranties of any kind. We do not guarantee uninterrupted, error-free, or secure service.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">7.3 Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, Phozos shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services, including but not limited to:
              </p>
              <ul className="list-disc pl-6">
                <li>Lost profits or opportunities</li>
                <li>Data loss or corruption</li>
                <li>Business interruption</li>
                <li>Missed application deadlines</li>
              </ul>
              <p className="mt-4">
                Our total liability shall not exceed the amount you paid to Phozos in the 12 months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless Phozos, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6">
                <li>Your use of our services</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Content you upload to our platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to Phozos at any time, with or without notice, for:
              </p>
              <ul className="list-disc pl-6">
                <li>Violation of these Terms of Service</li>
                <li>Fraudulent or illegal activity</li>
                <li>Non-payment of fees</li>
                <li>Extended inactivity</li>
              </ul>
              <p className="mt-4">
                Upon termination, your right to use Phozos will immediately cease. We may delete your account and data, though we may retain certain information as required by law or for legitimate business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Governing Law and Dispute Resolution</h2>
              <h3 className="text-xl font-semibold mb-2">10.1 Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where Phozos is registered, without regard to conflict of law principles.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">10.2 Dispute Resolution</h3>
              <p>
                Any disputes arising from these Terms or your use of Phozos shall be resolved through:
              </p>
              <ul className="list-disc pl-6">
                <li><strong>Informal Resolution:</strong> Contact us first to attempt resolution</li>
                <li><strong>Arbitration:</strong> Binding arbitration if informal resolution fails</li>
                <li><strong>No Class Actions:</strong> You agree to resolve disputes individually, not as part of a class action</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will notify users of material changes via:
              </p>
              <ul className="list-disc pl-6">
                <li>Email notification to your registered email address</li>
                <li>Prominent notice on our website</li>
                <li>In-app notification</li>
              </ul>
              <p className="mt-4">
                Continued use of Phozos after changes constitutes acceptance of the new Terms. If you disagree with changes, you must stop using our services and cancel your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <p>
                For questions about these Terms of Service, contact us at:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> <a href="mailto:hey@phozos.com" className="text-primary hover:underline">hey@phozos.com</a><br />
                <strong>Address:</strong> Phozos Study Abroad Platform
              </p>
            </section>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
