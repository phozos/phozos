import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/StructuredData";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "What is Phozos Study Abroad?",
    answer: "Phozos - a unique word coined by founder Mr. Chetan from the Greek words 'Phōs' (light) and 'Zoēs' (life) meaning 'Light of Life' - is a comprehensive platform that helps students find and apply to universities worldwide. We combine AI-powered university matching, application tracking, expert counseling, and a supportive community to make your study abroad journey smooth and successful."
  },
  {
    question: "How does the AI university matching work?",
    answer: "Our AI algorithm analyzes your academic profile, test scores, preferences, budget, and career goals to recommend universities that best match your profile. The system considers factors like admission probability, program fit, location preferences, and scholarship opportunities to provide personalized recommendations."
  },
  {
    question: "What subscription plans do you offer?",
    answer: "We offer four flexible subscription plans: Explorer (basic features for 5 universities), Achiever (comprehensive features for 10 universities), Champion (premium features for 20 universities), and Legend (unlimited universities with priority support). Each plan includes varying levels of counseling support, document reviews, and application tracking."
  },
  {
    question: "How much do Phozos subscription plans cost?",
    answer: "Our plans start from an affordable price point and scale based on the number of universities and level of support you need. Explorer is our entry-level plan, followed by Achiever, Champion, and Legend. Visit our Plans page for current pricing details and to find the plan that best fits your needs and budget."
  },
  {
    question: "Can I change my subscription plan later?",
    answer: "Yes, you can upgrade or downgrade your subscription plan at any time from your dashboard. When you upgrade, you'll get immediate access to additional features and university slots. If you downgrade, changes will take effect at the end of your current billing cycle."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 7-day money-back guarantee on all subscription plans. If you're not satisfied with our service within the first 7 days, contact our support team for a full refund. After 7 days, refunds are provided on a case-by-case basis depending on usage and circumstances."
  },
  {
    question: "Which countries and universities do you cover?",
    answer: "We cover universities in 50+ countries including the USA, UK, Canada, Australia, Germany, Netherlands, Ireland, New Zealand, and many more. Our database includes thousands of universities ranging from top-ranked institutions to specialized colleges. You can filter universities by country, program, ranking, and other criteria."
  },
  {
    question: "How does the counseling support work?",
    answer: "Our expert counselors provide personalized guidance throughout your application journey. Depending on your plan, you'll have access to one-on-one sessions, document reviews, SOP/essay feedback, interview preparation, and visa guidance. You can schedule sessions through your dashboard and communicate with counselors via chat or video calls."
  },
  {
    question: "What is the application tracking feature?",
    answer: "Our application tracking system helps you manage all your university applications in one place. Track deadlines, document submissions, application status, interview schedules, and decision updates. You'll receive automated reminders for important deadlines and get real-time notifications about application status changes."
  },
  {
    question: "How do I upload and manage my documents?",
    answer: "You can upload all your documents (transcripts, test scores, recommendations, etc.) to your Phozos dashboard. Our system securely stores your documents and allows you to organize them by category. You can reuse documents across multiple applications and track which documents have been submitted to each university."
  },
  {
    question: "Is my personal information and data secure?",
    answer: "Yes, we take data security very seriously. All data is encrypted in transit and at rest. We use industry-standard security measures and comply with GDPR and other data protection regulations. Your personal information and documents are never shared with third parties without your explicit consent."
  },
  {
    question: "How quickly can I expect a response from counselors?",
    answer: "Response times vary by subscription plan. Legend plan members get priority support with responses typically within 24 hours. Champion plan members can expect responses within 48 hours, while Achiever and Explorer plan members typically receive responses within 2-3 business days. For urgent matters, you can mark your query as high priority."
  },
  {
    question: "Can I apply to universities directly through Phozos?",
    answer: "Phozos helps you organize and track your applications, but you typically submit applications through each university's official application portal. We guide you through the entire process, help you prepare all required documents, and ensure you meet all deadlines. Some partner universities may offer direct application options through our platform."
  },
  {
    question: "Do you help with visa applications?",
    answer: "Yes, our higher-tier plans (Champion and Legend) include visa guidance. Our counselors can help you understand visa requirements, prepare necessary documentation, and provide tips for visa interviews. However, we recommend consulting with licensed immigration attorneys for complex visa situations."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept major credit cards, debit cards, and online payment methods. All payments are processed securely through encrypted payment gateways. You can manage your payment methods and view billing history from your account settings."
  }
];

export default function FAQ() {
  return (
    <>
      <SEO
        title="Frequently Asked Questions - Phozos Study Abroad"
        description="Find answers to common questions about Phozos Study Abroad. Learn about our subscription plans, university matching, counseling services, and application process."
        keywords="phozos faq, study abroad questions, university application help, phozos support, international education faq"
        canonical="/faq"
      />
      
      <FAQSchema items={faqs} />
      
      <div className="min-h-screen bg-background">
        <Navigation />
        <Breadcrumbs items={[{ label: 'FAQ', href: '/faq' }]} />
        
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream via-background to-primary/5 pt-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.04%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-fade-in">
              <Badge variant="secondary" className="mb-6 px-6 py-2 text-base font-semibold">
                <HelpCircle className="mr-2 w-4 h-4" />
                FAQ
              </Badge>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
                Frequently Asked{" "}
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                  Questions
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Find answers to common questions about Phozos and your study abroad journey
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-2">
              <CardContent className="p-8">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left hover:text-primary">
                        <span className="font-semibold">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Still Have Questions Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 to-amber-50/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Card className="border-2 shadow-xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
                <p className="text-muted-foreground text-lg mb-6">
                  Can't find the answer you're looking for? Our support team is here to help.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="/contact" className="inline-block">
                    <button className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                      Contact Support
                    </button>
                  </a>
                  <a href="mailto:hey@phozos.com" className="inline-block">
                    <button className="px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition-all">
                      Email Us
                    </button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
