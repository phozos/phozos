import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MapPin,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle
} from "lucide-react";

export default function Contact() {
  return (
    <>
      <SEO
        title="Contact Us - Phozos Study Abroad"
        description="Get in touch with Phozos Study Abroad. Contact our team for support with your international education journey. Email: hey@phozos.com, Phone: +91-7526951566"
        keywords="contact phozos, study abroad support, phozos contact information, international education help"
        canonical="/contact"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />
        <Breadcrumbs items={[{ label: 'Contact', href: '/contact' }]} />
        
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream via-background to-primary/5 pt-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.04%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-fade-in">
              <Badge variant="secondary" className="mb-6 px-6 py-2 text-base font-semibold">
                <MessageCircle className="mr-2 w-4 h-4" />
                Get In Touch
              </Badge>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
                Contact{" "}
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                  Phozos
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Have questions about studying abroad? We're here to help you every step of the way.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Email Us</h3>
                  <a 
                    href="mailto:hey@phozos.com" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    hey@phozos.com
                  </a>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Call Us</h3>
                  <a 
                    href="tel:+917526951566" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    +91-7526951566
                  </a>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Corporate Office</h3>
                  <p className="text-muted-foreground text-sm">
                    Koramangala<br />
                    Bengaluru, Karnataka<br />
                    India
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Global Operations</h3>
                  <p className="text-muted-foreground text-sm">
                    Remote Worldwide<br />
                    Serving 50+ countries<br />
                    24/7 Support
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Office Locations */}
        <section className="py-20 bg-gradient-to-br from-primary/5 to-amber-50/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Our Offices</h2>
              <p className="text-xl text-muted-foreground">
                Visit us at our locations in India
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Corporate Office</h3>
                      <p className="text-muted-foreground mb-4">
                        Koramangala<br />
                        Bengaluru, Karnataka<br />
                        India
                      </p>
                      <Badge variant="secondary">Main Hub</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Registered Office</h3>
                      <p className="text-muted-foreground mb-4">
                        Bathinda<br />
                        Punjab<br />
                        India
                      </p>
                      <Badge variant="secondary">Legal Address</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Social Media */}
        <section className="py-20 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-4">Connect With Us</h2>
            <p className="text-xl text-muted-foreground mb-12">
              Follow us on social media for updates, tips, and student success stories
            </p>

            <div className="flex flex-wrap justify-center gap-6">
              <a
                href="https://www.facebook.com/phozos"
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1 w-48">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Facebook className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold">Facebook</h3>
                    <p className="text-sm text-muted-foreground">@phozos</p>
                  </CardContent>
                </Card>
              </a>

              <a
                href="https://www.instagram.com/phozosofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1 w-48">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Instagram className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold">Instagram</h3>
                    <p className="text-sm text-muted-foreground">@phozosofficial</p>
                  </CardContent>
                </Card>
              </a>

              <a
                href="https://www.twitter.com/phozosofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1 w-48">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-sky-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Twitter className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold">Twitter</h3>
                    <p className="text-sm text-muted-foreground">@phozosofficial</p>
                  </CardContent>
                </Card>
              </a>
            </div>
          </div>
        </section>

        {/* Quick Contact Card */}
        <section className="py-20 bg-gradient-to-br from-primary/5 to-amber-50/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-2 shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2">Ready to Start Your Journey?</h2>
                  <p className="text-muted-foreground">
                    Get in touch with our team and let's make your study abroad dreams a reality
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email us at</p>
                      <a 
                        href="mailto:hey@phozos.com" 
                        className="text-lg font-semibold hover:text-primary transition-colors"
                      >
                        hey@phozos.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Call us at</p>
                      <a 
                        href="tel:+917526951566" 
                        className="text-lg font-semibold hover:text-primary transition-colors"
                      >
                        +91-7526951566
                      </a>
                    </div>
                  </div>
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
