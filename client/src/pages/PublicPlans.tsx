import React from "react";
import { Link } from "wouter";
import { useApiQuery } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Crown, Zap, Award, Sparkles, Globe, Users, Heart, Rocket, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { PremiumBadgeDisplay } from "@/components/PremiumBadges";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/StructuredData";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  description: string;
  logo: string;
  features: string[];
  maxUniversities: number;
  maxCountries: number;
  supportType: string;
  isActive: boolean;
  displayOrder: number;
}

export default function PublicPlans() {
  // Fetch active subscription plans for public display
  const { data: plans = [], isLoading } = useApiQuery<SubscriptionPlan[]>(
    ["/api/subscription-plans"],
    '/api/subscription-plans'
  );

  const faqItems = [
    {
      question: "Can I change my plan anytime?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences."
    },
    {
      question: "Is there a free trial?",
      answer: "Our Explorer plan includes free features to get you started. Experience our platform before committing to premium features."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, and bank transfers for annual plans. All payments are secured and encrypted."
    },
    {
      question: "Do you offer student discounts?",
      answer: "Yes! We offer 20% student discounts on all plans. Simply contact our support team with your valid student ID to get started."
    },
    {
      question: "What if I need to cancel?",
      answer: "You can cancel anytime with no hidden fees. We offer a 30-day money-back guarantee if you're not completely satisfied."
    },
    {
      question: "How does the university matching work?",
      answer: "Our AI analyzes your profile, grades, preferences, and goals to recommend the best-fit universities with high acceptance probability."
    }
  ];

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'explorer': return Star;
      case 'achiever': return Zap;
      case 'champion': return Crown;
      case 'legend': return Award;
      default: return Star;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'explorer': return 'from-blue-500 to-cyan-500';
      case 'achiever': return 'from-emerald-500 to-teal-500';
      case 'champion': return 'from-purple-500 to-pink-500';
      case 'legend': return 'from-amber-500 to-orange-500';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getPlanBackgroundGradient = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'explorer': return 'bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-sky-900/20';
      case 'achiever': return 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-green-900/20';
      case 'champion': return 'bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20';
      case 'legend': return 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20';
      default: return 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-96"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Subscription Plans - Phozos Study Abroad"
        description="Choose the perfect plan for your study abroad journey. From Explorer to Legend, unlock universities worldwide with premium features and expert support."
        keywords="phozos plans, study abroad subscription, university application plans, student pricing"
        canonical="/plans"
        ogImage="/og-plans.png"
      />
      <FAQSchema items={faqItems} />
      
      <div className="min-h-screen bg-background">
        <Navigation />
        <Breadcrumbs items={[{ label: 'Plans', href: '/plans' }]} />
      
      {/* Hero Section - Enhanced with homepage styling */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream via-background to-primary/5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.04%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                Education Journey
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Select the perfect plan to unlock universities worldwide, expert guidance, 
              and premium support for your study abroad dreams.
            </p>
            
            {/* Enhanced CTA Section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Badge variant="secondary" className="px-6 py-3 text-base font-semibold">
                <Sparkles className="mr-2 w-4 h-4" />
                Annual Billing - Save 20%
              </Badge>
              <Badge variant="outline" className="px-6 py-3 text-base font-semibold border-primary/20">
                <Heart className="mr-2 w-4 h-4 text-red-500" />
                Loved by 50K+ Students
              </Badge>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { value: "500+", label: "Universities", icon: Globe },
                { value: "50K+", label: "Students", icon: Users },
                { value: "95%", label: "Success Rate", icon: TrendingUp },
                { value: "40+", label: "Countries", icon: Star },
              ].map((stat) => (
                <div key={stat.label} className="text-center group hover:scale-105 transition-transform duration-200">
                  <div className="mb-2 flex justify-center">
                    <stat.icon className="w-8 h-8 text-primary group-hover:text-amber-500 transition-colors duration-200" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-xl animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
      </section>

      {/* Pricing Plans - Enhanced Design */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Plans That Grow With Your
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent"> Dreams</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From exploring options to achieving legendary status, we have the perfect plan for every step of your journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans
              .filter(plan => plan.isActive)
              .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
              .map((plan, index) => {
                const gradientColor = getPlanColor(plan.name);
                const backgroundGradient = getPlanBackgroundGradient(plan.name);
                const PlanIcon = getPlanIcon(plan.name);
                const isPopular = index === 1; // Make second plan (Achiever) most popular
                const isFree = parseFloat(plan.price) === 0;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`
                      relative overflow-hidden group hover:shadow-2xl transition-all duration-500 
                      ${isPopular ? 'ring-2 ring-primary shadow-2xl scale-105 z-10' : 'hover:scale-105'} 
                      ${backgroundGradient}
                      border-2 ${isPopular ? 'border-primary/20' : 'border-border/50 hover:border-primary/20'}
                    `}
                    data-testid={`plan-card-${plan.name.toLowerCase()}`}
                  >
                    {/* Glow Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${gradientColor} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                    
                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                        <Badge className="bg-gradient-to-r from-primary to-amber-500 text-white px-6 py-2 font-semibold shadow-lg">
                          <Sparkles className="mr-2 w-4 h-4" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-6 relative z-10">
                      {/* Plan Icon with Gradient Background */}
                      <div className="mb-6 flex justify-center">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${gradientColor} p-0.5 group-hover:scale-110 transition-transform duration-300`}>
                          <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
                            <PlanIcon className="w-10 h-10 text-gray-700 dark:text-gray-300" />
                          </div>
                        </div>
                      </div>

                      <CardTitle className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground mb-6">
                        {plan.description}
                      </CardDescription>
                      
                      {/* Pricing */}
                      <div className="mb-6">
                        <div className="flex items-baseline justify-center">
                          {isFree ? (
                            <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              Free
                            </span>
                          ) : (
                            <>
                              <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                              <span className="text-muted-foreground ml-2">/year</span>
                            </>
                          )}
                        </div>
                        {!isFree && (
                          <div className="text-sm text-muted-foreground mt-1">
                            ${(parseFloat(plan.price) / 12).toFixed(0)}/month billed annually
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6 relative z-10">
                      {/* Key Stats with Icons */}
                      <div className="space-y-3 pb-6 border-b border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <span className="text-sm text-muted-foreground">Universities</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            {plan.maxUniversities === 999999 ? 'Unlimited' : plan.maxUniversities}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-sm text-muted-foreground">Countries</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            {plan.maxCountries === 999 ? 'All' : plan.maxCountries}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Heart className="w-4 h-4 text-primary" />
                            <span className="text-sm text-muted-foreground">Support</span>
                          </div>
                          <span className="font-semibold text-foreground capitalize">{plan.supportType}</span>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="space-y-3">
                        {plan.features.slice(0, 6).map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start space-x-3">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${gradientColor} p-0.5 mt-0.5 flex-shrink-0`}>
                              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-600" />
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                          </div>
                        ))}
                        {plan.features.length > 6 && (
                          <div className="text-sm text-muted-foreground pl-8 italic">
                            + {plan.features.length - 6} more amazing features
                          </div>
                        )}
                      </div>

                      {/* CTA Button */}
                      <Button 
                        className={`
                          w-full mt-8 text-base font-semibold py-6 relative overflow-hidden group
                          ${isPopular 
                            ? 'bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white shadow-lg' 
                            : 'border-2 hover:border-primary/50'
                          }
                        `}
                        variant={isPopular ? 'default' : 'outline'}
                        size="lg"
                        data-testid={`button-choose-plan-${plan.name.toLowerCase()}`}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Rocket className="w-5 h-5" />
                          <span>{isFree ? 'Get Started Free' : 'Choose Plan'}</span>
                        </div>
                        {isPopular && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      </section>

      {/* FAQ Section - Enhanced Design */}
      <section className="py-20 bg-gradient-to-br from-cream via-background to-primary/5 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Got 
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent"> Questions?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about our subscription plans and how we can help you achieve your study abroad dreams.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                question: "Can I change my plan anytime?",
                answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences.",
                icon: Rocket
              },
              {
                question: "Is there a free trial?",
                answer: "Our Explorer plan includes free features to get you started. Experience our platform before committing to premium features.",
                icon: Star
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, PayPal, and bank transfers for annual plans. All payments are secured and encrypted.",
                icon: Crown
              },
              {
                question: "Do you offer student discounts?",
                answer: "Yes! We offer 20% student discounts on all plans. Simply contact our support team with your valid student ID to get started.",
                icon: Heart
              },
              {
                question: "What if I need to cancel?",
                answer: "You can cancel anytime with no hidden fees. We offer a 30-day money-back guarantee if you're not completely satisfied.",
                icon: Check
              },
              {
                question: "How does the university matching work?",
                answer: "Our AI analyzes your profile, grades, preferences, and goals to recommend the best-fit universities with high acceptance probability.",
                icon: Zap
              }
            ].map((faq, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
                data-testid={`faq-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-primary/10 to-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <faq.icon className="w-6 h-6 text-primary group-hover:text-amber-500 transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                        {faq.question}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-8 border border-border/50">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Still have questions?
              </h3>
              <p className="text-muted-foreground mb-6">
                Our support team is here to help you find the perfect plan for your educational journey.
              </p>
              <Button size="lg" className="px-8 py-4 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white font-semibold shadow-lg">
                <Heart className="mr-2 w-5 h-5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-10 right-10 w-20 h-20 bg-amber-500/10 rounded-full blur-xl animate-pulse-slow"></div>
        <div className="absolute bottom-10 left-10 w-16 h-16 bg-primary/10 rounded-full blur-xl animate-pulse-slow" style={{ animationDelay: "1.5s" }}></div>
      </section>

      {/* Related Pages Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-amber-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Related Pages</h2>
            <p className="text-xl text-muted-foreground">
              Explore more about Phozos and get answers to your questions
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Link href="/about">
              <Card className="group h-full border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Globe className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        About Phozos
                      </h3>
                      <p className="text-muted-foreground">
                        Learn about our mission to make international education accessible to students worldwide through technology and expert counseling.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    Learn More →
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/faq">
              <Card className="group h-full border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        Frequently Asked Questions
                      </h3>
                      <p className="text-muted-foreground">
                        Find answers to common questions about our subscription plans, university matching, counseling services, and application process.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    View FAQ →
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
}