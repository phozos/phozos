import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Target, 
  Users, 
  Heart, 
  Award, 
  TrendingUp,
  MapPin,
  Mail,
  Phone,
  Sparkles
} from "lucide-react";

export default function About() {
  return (
    <>
      <SEO
        title="About Us - Phozos Study Abroad"
        description="Learn about Phozos' mission to make international education accessible to students worldwide through technology and expert counseling."
        keywords="about phozos, study abroad company, education technology, international student services"
        canonical="/about"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />
        <Breadcrumbs items={[{ label: 'About', href: '/about' }]} />
        
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream via-background to-primary/5 pt-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.04%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-fade-in">
              <Badge variant="secondary" className="mb-6 px-6 py-2 text-base font-semibold">
                <Sparkles className="mr-2 w-4 h-4" />
                About Phozos
              </Badge>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
                Empowering Your{" "}
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                  Global Education Journey
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Making international education accessible to students worldwide through 
                innovative technology and expert counseling.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary to-purple-500 rounded-xl flex items-center justify-center mb-6">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    To democratize access to international education by providing students 
                    with cutting-edge AI-powered tools, expert guidance, and comprehensive 
                    support throughout their study abroad journey. We believe every student 
                    deserves the opportunity to pursue their global education dreams.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    To become the world's most trusted platform for international education, 
                    connecting millions of students with their dream universities and 
                    transforming the way students navigate their study abroad journey through 
                    innovation and personalized support.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 to-amber-50/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Our Story</h2>
              <p className="text-xl text-muted-foreground">
                From vision to reality
              </p>
            </div>
            
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="prose prose-lg max-w-none">
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    Phozos was born from a simple observation: the study abroad process is 
                    unnecessarily complex, expensive, and inaccessible to many deserving students. 
                    Traditional education consultancies often charge hefty fees, provide limited 
                    options, and lack transparency.
                  </p>
                  
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    We set out to change this by building a technology-first platform that combines 
                    the power of artificial intelligence with human expertise. Our platform helps 
                    students discover universities that truly match their profiles, manage their 
                    applications efficiently, and receive expert guidance at an affordable price.
                  </p>
                  
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Today, we're proud to serve thousands of students worldwide, helping them 
                    navigate the complexities of international education and achieve their dreams 
                    of studying at top universities across the globe.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">What Makes Us Different</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                We're reimagining the study abroad experience with innovation and care
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6">
                    <Globe className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">AI-Powered Matching</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our advanced AI algorithm analyzes your profile to recommend universities 
                    that best match your academic goals, preferences, and budget.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Expert Counselors</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Get personalized guidance from experienced counselors who understand the 
                    nuances of international admissions and visa processes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-6">
                    <Heart className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Affordable & Transparent</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Flexible subscription plans with no hidden fees. Pay only for the services 
                    you need, with complete transparency every step of the way.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-6">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Comprehensive Tracking</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Track all your applications, documents, and deadlines in one place. 
                    Stay organized and never miss an important milestone.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Global Reach</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Access thousands of universities across 50+ countries. From the US to 
                    Australia, Canada to Europe, we've got you covered.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-6">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Student Community</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Connect with fellow students, share experiences, and get advice from 
                    those who've been through the journey before you.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Global Operations */}
        <section className="py-20 bg-gradient-to-br from-primary/5 to-amber-50/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Our Global Presence</h2>
              <p className="text-xl text-muted-foreground">
                Serving students worldwide from our offices in India
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Corporate Office</h3>
                  <p className="text-muted-foreground">
                    Koramangala<br />
                    Bengaluru, Karnataka<br />
                    India
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Registered Office</h3>
                  <p className="text-muted-foreground">
                    Bathinda<br />
                    Punjab<br />
                    India
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Global Operations</h3>
                  <p className="text-muted-foreground">
                    Remote Worldwide<br />
                    Serving students in<br />
                    50+ countries
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <Card className="inline-block border-2">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6 text-left">
                    <div className="flex items-center gap-3">
                      <Mail className="w-6 h-6 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-semibold">hey@phozos.com</p>
                      </div>
                    </div>
                    
                    <div className="hidden md:block w-px h-12 bg-border"></div>
                    
                    <div className="flex items-center gap-3">
                      <Phone className="w-6 h-6 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-semibold">+91-7526951566</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
