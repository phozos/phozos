import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useApiQuery } from "@/hooks/api-hooks";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SEO } from "@/components/SEO";
import { OrganizationSchema, WebsiteSchema } from "@/components/StructuredData";
import { 
  GraduationCap, 
  Brain, 
  Target, 
  TrendingUp, 
  Search, 
  Globe, 
  DollarSign, 
  Star,
  Plus,
  Eye,
  Heart,
  Play,
  Rocket,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  MessageSquare,
  Share,
  Users,
  Award,
  Zap,
  Download
} from "lucide-react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    country: "",
    field: "",
    tuitionRange: "",
    ranking: ""
  });

  // Fetch real universities from database
  const { data: apiResponse, isLoading: universitiesLoading } = useApiQuery(
    ["/api/admin/universities"],
    '/api/admin/universities'
  );

  // Extract universities array from API response structure {success: true, data: [...], meta: {...}}
  const universities = Array.isArray((apiResponse as any)?.data) ? (apiResponse as any).data : [];

  // Function to get top ranked universities randomly
  const getTopRankedUniversities = () => {
    if (!universities || universities.length === 0) return [];
    
    // Filter universities with world ranking and sort by ranking
    const rankedUniversities = universities
      .filter((uni: any) => uni.worldRanking && uni.worldRanking <= 20)
      .sort((a: any, b: any) => (a.worldRanking || 999) - (b.worldRanking || 999));
    
    // If we have fewer than 20 ranked universities, use top universities by name
    const topUniversities = rankedUniversities.length >= 3 
      ? rankedUniversities 
      : universities.slice(0, 20);
    
    // Randomly select 3 universities
    const shuffled = [...topUniversities].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const featuredUniversities = getTopRankedUniversities();

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <LoadingSkeleton type="card" count={3} />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Phozos Study Abroad - Your Global Education Journey"
        description="Discover universities worldwide with AI-powered matching, expert counseling, and comprehensive application tracking. Join 50,000+ students achieving their study abroad dreams."
        keywords="study abroad, international education, university applications, AI university matching, student counseling, global education"
        canonical="/"
        ogImage="/og-home.png"
        twitterCard="summary_large_image"
      />
      <OrganizationSchema />
      <WebsiteSchema />
      
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white via-amber-50/20 to-orange-50/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 pt-16">
        {/* Optimized Background - Reduced orbs for better performance */}
      <div className="fixed inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-purple-200/40 to-blue-200/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-br from-amber-200/35 to-orange-200/25 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-br from-indigo-200/30 to-purple-200/20 rounded-full blur-xl"></div>
      </div>
      
      {/* Removed animated bubbles for better performance */}
      
      {/* Subtle grain texture overlay */}
      <div className="fixed inset-0 opacity-[0.02] bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22/%3E%3C/filter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] pointer-events-none"></div>
      
      <Navigation user={user} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60"></div>
        
        {/* Premium iOS-style glass container for hero content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative group">
            {/* Main liquid glass container */}
            <div className="relative liquid-glass dark:liquid-glass-dark liquid-glass-interactive rounded-[3rem] p-8 md:p-12 lg:p-16 text-center overflow-hidden group">
              {/* Content */}
              <div className="relative z-10">
            <div className="animate-fade-in">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
                Your Journey to{" "}
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                  Global Education
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Discover universities worldwide with AI-powered matching, expert guidance, 
                and a community of ambitious students.
              </p>
              
              {/* Premium CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button size="lg" className="group relative px-8 py-4 text-lg font-semibold bg-primary hover:bg-primary/90 text-white rounded-[1.25rem] shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                  <Link href="/auth">
                    <span className="relative z-10 flex items-center">
                      <Rocket className="mr-2 w-5 h-5" />
                      Get Started
                    </span>
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="group relative px-8 py-4 text-lg font-semibold border-white/20 hover:border-white/40 hover:bg-white/5 rounded-[1.25rem] transition-all duration-300">
                  <span className="relative z-10 flex items-center">
                    <Play className="mr-2 w-5 h-5" />
                    Watch Demo
                  </span>
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                {[
                  { value: "500+", label: "Universities" },
                  { value: "50K+", label: "Students" },
                  { value: "95%", label: "Success Rate" },
                  { value: "40+", label: "Countries" },
                ].map((stat) => (
                  <div key={stat.label} className="group relative text-center liquid-glass-card dark:liquid-glass-dark liquid-glass-interactive rounded-[2rem] p-6">
                    <div className="relative z-10">
                      <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                        {stat.value}
                      </div>
                      <div className="text-muted-foreground">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Premium Glass Floating Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white/30 to-gray-200/20 rounded-full blur-3xl shadow-[0_0_80px_25px_rgba(255,255,255,0.1)]"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-amber-100/30 to-orange-100/20 rounded-full blur-3xl shadow-[0_0_100px_30px_rgba(251,191,36,0.1)]"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-br from-gray-100/25 to-white/20 rounded-full blur-2xl shadow-[0_0_60px_20px_rgba(255,255,255,0.08)]"></div>
        <div className="absolute top-3/4 right-1/3 w-20 h-20 bg-gradient-to-br from-cream-50/20 to-amber-50/15 rounded-full blur-xl shadow-[0_0_50px_15px_rgba(251,191,36,0.05)]"></div>
      </section>

      {/* AI Matching Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative group">
            {/* Advanced liquid glass container */}
            <div className="relative liquid-glass dark:liquid-glass-dark liquid-glass-interactive rounded-[3rem] p-8 md:p-12 overflow-hidden">
              {/* Content wrapper */}
              <div className="relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                AI-Powered University Matching
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our advanced AI analyzes your profile, preferences, and goals to recommend 
                the perfect universities for your journey.
              </p>
            </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                {
                  icon: Brain,
                  title: "Smart Profile Analysis",
                  description: "AI analyzes your academic background, test scores, and preferences to create a comprehensive profile.",
                  color: "bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700",
                  iconBg: "bg-primary"
                },
                {
                  icon: Target,
                  title: "Precision Matching",
                  description: "Get personalized university recommendations with 95% accuracy based on your unique profile.",
                  color: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700",
                  iconBg: "bg-amber-500"
                },
                {
                  icon: TrendingUp,
                  title: "Success Prediction",
                  description: "AI predicts your admission chances and suggests improvements to strengthen your application.",
                  color: "bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-green-200 dark:border-green-700",
                  iconBg: "bg-green-500"
                }
              ].map((feature) => (
                <Card key={feature.title} className="group relative liquid-glass-card dark:liquid-glass-dark liquid-glass-interactive rounded-[2rem]">
                  <CardContent className="relative p-6 z-10">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`relative w-14 h-14 ${feature.iconBg} rounded-[1.25rem] flex items-center justify-center shadow-[0_4px_16px_0_rgba(31,38,135,0.2)] group-hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.3)] transition-all duration-300`}>
                        <feature.icon className="relative z-10 w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* AI Dashboard Mockup */}
            <div className="relative">
              <Card className="relative liquid-glass-card dark:liquid-glass-dark liquid-glass-interactive rounded-[2.5rem]">
                <CardContent className="relative p-6 z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">AI Recommendations</h3>
                    <div className="flex items-center space-x-2 text-green-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">Live</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { name: "Stanford University", match: "97%", field: "Computer Science", color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" },
                      { name: "MIT", match: "94%", field: "Engineering", color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
                      { name: "Harvard University", match: "91%", field: "Business", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" }
                    ].map((uni) => (
                      <div key={uni.name} className="group flex items-center space-x-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[1.5rem] transition-all duration-300">
                        <div className="w-16 h-12 bg-gradient-to-r from-primary to-amber-500 rounded-[1.25rem] shadow-[0_4px_12px_0_rgba(31,38,135,0.2)]"></div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{uni.name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${uni.bgColor} ${uni.color} border-0`}>
                              {uni.match} Match
                            </Badge>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className="text-muted-foreground text-sm">{uni.field}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="w-full mt-6" asChild>
                    <Link href="/universities">View All Recommendations</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Badge className="absolute -top-4 -right-4 bg-gradient-to-r from-primary to-pink-500 text-white px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                AI Powered
              </Badge>
            </div>
          </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* University Search Preview */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative liquid-glass dark:liquid-glass-dark liquid-glass-interactive rounded-[2.5rem] p-8 md:p-12 overflow-hidden">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Find Your Perfect University
              </h2>
              <p className="text-xl text-muted-foreground">
                Search through 500+ universities with advanced filters and real-time recommendations
              </p>
            </div>
            
            <div className="relative z-10">
              {/* Search Bar */}
              <div className="relative mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input 
                    placeholder="Search universities, courses, or locations..." 
                    className="pl-12 pr-32 py-4 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button className="absolute right-2 top-1/2 transform -translate-y-1/2" asChild>
                    <Link href="/universities">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Filter Chips */}
              <div className="flex flex-wrap gap-3 mb-8">
                {[
                  { icon: Globe, label: "Country" },
                  { icon: GraduationCap, label: "Field of Study" },
                  { icon: DollarSign, label: "Tuition Range" },
                  { icon: Star, label: "Ranking" },
                  { icon: Plus, label: "More Filters" }
                ].map((filter, index) => (
                  <Button 
                    key={filter.label} 
                    variant={index === 0 ? "default" : "outline"} 
                    size="sm"
                    className={`h-9 rounded-2xl transition-all duration-300 ${
                      index === 0 
                        ? "apple-glass dark:apple-glass-dark text-gray-900 dark:text-white hover:shadow-[0_6px_20px_0_rgba(31,38,135,0.15)]" 
                        : "minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)]"
                    }`}
                  >
                    <filter.icon className="w-4 h-4 mr-2" />
                    {filter.label}
                  </Button>
                ))}
              </div>
              
              {/* Results Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {universitiesLoading ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="group relative minimal-glass dark:apple-glass-dark rounded-3xl animate-pulse">
                      <CardContent className="relative p-6 z-10">
                        <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-3xl mb-4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-3/4"></div>
                        <div className="flex justify-between mb-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                          <div className="h-8 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  featuredUniversities.map((uni: any) => (
                  <Card key={uni.id} className="group relative minimal-glass dark:apple-glass-dark rounded-3xl hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.12)] transition-all transform hover:-translate-y-3 animate-float" style={{ animationDelay: `${Math.random() * 3}s` }}>
                    <CardContent className="relative p-6 z-10">
                      {/* University Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-foreground mb-1">{uni.name}</h3>
                          <p className="text-muted-foreground text-sm">{uni.city}, {uni.country}</p>
                        </div>
                        {uni.worldRanking && (
                          <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 px-3 py-1 rounded-full">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">#{uni.worldRanking}</span>
                          </div>
                        )}
                      </div>

                      {/* Specialization */}
                      {uni.specialization && (
                        <div className="mb-3">
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {uni.specialization}
                          </Badge>
                        </div>
                      )}

                      {/* Description */}
                      {uni.description && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{uni.description}</p>
                      )}

                      {/* Fees Section */}
                      <div className="space-y-2 mb-4">
                        {uni.offerLetterFee && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Offer Letter Fee:</span>
                            <span className="text-sm font-semibold text-foreground">${uni.offerLetterFee}</span>
                          </div>
                        )}
                        {uni.annualFee && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Annual Fee:</span>
                            <span className="text-sm font-semibold text-primary">${uni.annualFee}/year</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <Button 
                          className="flex-1 apple-glass dark:apple-glass-dark text-gray-900 dark:text-white hover:shadow-[0_6px_20px_0_rgba(31,38,135,0.15)] rounded-2xl transition-all duration-300" 
                          size="sm"
                          onClick={() => {
                            if (uni.website) {
                              window.open(uni.website, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          Know More
                        </Button>
                        <Button variant="outline" size="sm" className="p-2 minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-2xl transition-all duration-300">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </div>
              
              <div className="text-center mt-8">
                <Button variant="outline" size="lg" className="minimal-glass dark:apple-glass-dark hover:shadow-[0_6px_20px_0_rgba(31,38,135,0.15)] rounded-2xl transition-all duration-300" asChild>
                  <Link href="/universities">Load More Universities</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative apple-glass dark:apple-glass-dark rounded-[2.5rem] p-8 md:p-12 overflow-hidden animate-float" style={{ animationDelay: "3.5s" }}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Your Personal Dashboard
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Track your applications, manage documents, and get insights with our enhanced student dashboard
              </p>
            </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Application Timeline */}
            <div className="lg:col-span-2">
              <Card className="relative h-full apple-glass dark:apple-glass-dark rounded-3xl animate-float" style={{ animationDelay: "4s" }}>
                <CardContent className="relative p-8 z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-foreground">Application Timeline</h3>
                    <Button variant="outline" size="sm" className="minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-2xl transition-all duration-300">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Application
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      {
                        icon: CheckCircle,
                        title: "Application Submitted",
                        description: "Stanford University - Computer Science",
                        time: "2 days ago",
                        status: "Under Review",
                        statusColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      },
                      {
                        icon: Clock,
                        title: "Documents Pending",
                        description: "MIT - Missing Letters of Recommendation",
                        time: "Due in 3 days",
                        status: "Action Required",
                        statusColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      },
                      {
                        icon: FileText,
                        title: "Essay Draft Ready",
                        description: "Harvard University - Personal Statement",
                        time: "1 week ago",
                        status: "Ready for Review",
                        statusColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }
                    ].map((item) => (
                      <div key={item.title} className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground">{item.title}</h4>
                            <span className="text-sm text-muted-foreground">{item.time}</span>
                          </div>
                          <p className="text-muted-foreground text-sm">{item.description}</p>
                          <Badge className={`mt-2 ${item.statusColor} border-0`}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Progress Overview */}
              <Card className="relative minimal-glass dark:apple-glass-dark rounded-3xl animate-float" style={{ animationDelay: "4.5s" }}>
                <CardContent className="relative p-6 z-10">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Progress Overview</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Applications", current: 3, total: 5, percentage: 60 },
                      { label: "Documents", current: 8, total: 12, percentage: 67 },
                      { label: "Essays", current: 2, total: 3, percentage: 67 }
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="text-foreground font-semibold">{item.current}/{item.total}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card className="relative minimal-glass dark:apple-glass-dark rounded-3xl animate-float" style={{ animationDelay: "5s" }}>
                <CardContent className="relative p-6 z-10">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Upload, label: "Upload Documents", color: "text-primary" },
                      { icon: Calendar, label: "Schedule Counseling", color: "text-amber-500" },
                      { icon: MessageSquare, label: "Join Community", color: "text-green-500" }
                    ].map((action) => (
                      <Button 
                        key={action.label}
                        variant="ghost" 
                        className="w-full justify-start minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-2xl transition-all duration-300"
                      >
                        <action.icon className={`w-4 h-4 mr-3 ${action.color}`} />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Success Metrics */}
              <div className="relative bg-gradient-to-r from-primary to-pink-500 backdrop-blur-2xl rounded-3xl p-6 text-white shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none">
                <h3 className="text-lg font-semibold mb-4">Success Prediction</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">87%</div>
                  <p className="text-white/80 text-sm">
                    Predicted admission success rate based on your profile
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative apple-glass dark:apple-glass-dark rounded-3xl p-8 md:p-12 overflow-hidden animate-float" style={{ animationDelay: "5.5s" }}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Success Stories
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Real stories from students who achieved their dreams with Phozos
              </p>
            </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: "Sarah Kim",
                university: "Harvard Medical School",
                quote: "Phozos's AI matching helped me find the perfect program. The counselor support was incredible!",
                gradient: "from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20",
                border: "border-purple-200 dark:border-purple-700"
              },
              {
                name: "Marcus Johnson",
                university: "MIT Engineering",
                quote: "From community college to MIT - Phozos made my dream possible with their guidance.",
                gradient: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
                border: "border-amber-200 dark:border-amber-700"
              },
              {
                name: "Priya Patel",
                university: "Oxford Business School",
                quote: "As an international student, Phozos's visa guidance was invaluable for my journey.",
                gradient: "from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20",
                border: "border-green-200 dark:border-green-700"
              },
              {
                name: "David Chen",
                university: "Stanford PhD Program",
                quote: "The research matching feature connected me with my ideal PhD advisor. Amazing!",
                gradient: "from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20",
                border: "border-pink-200 dark:border-pink-700"
              }
            ].map((story) => (
              <Card key={story.name} className="relative bg-white/70 dark:bg-black/40 backdrop-blur-2xl border border-white/60 dark:border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none">
                <CardContent className="relative p-6 text-center z-10">
                  <div className="w-full h-40 bg-gradient-to-r from-primary to-amber-500 rounded-3xl mb-4 shadow-lg"></div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{story.name}</h3>
                  <p className="text-primary text-sm mb-3">{story.university}</p>
                  <p className="text-muted-foreground text-sm">"{story.quote}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-purple-700 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Start Your Journey Today
          </h2>
          <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto">
            Join thousands of students who have achieved their dreams with Phozos's AI-powered platform
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="px-8 py-4 bg-white text-primary hover:bg-gray-100" asChild>
              <Link href="/auth">
                <Rocket className="mr-2 w-5 h-5" />
                Get Started
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-4 bg-white/30 dark:bg-black/20 backdrop-blur-2xl border border-white/60 dark:border-white/20 text-white hover:bg-white/40 dark:hover:bg-black/30 rounded-2xl shadow-[0_4px_16px_0_rgba(31,38,135,0.2)]">
              <Calendar className="mr-2 w-5 h-5" />
              Book a Demo
            </Button>
          </div>
          
          {/* PWA Install Prompt */}
          <Card className="relative bg-white/30 dark:bg-black/20 backdrop-blur-3xl border border-white/40 dark:border-white/20 max-w-md mx-auto rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none">
            <CardContent className="relative p-6 z-10">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Download className="text-white text-2xl" />
                <h3 className="text-white font-semibold">Install Our App</h3>
              </div>
              <p className="text-purple-100 text-sm mb-4">
                Get the full Phozos experience on your mobile device
              </p>
              <Button className="w-full bg-white/90 dark:bg-black/60 backdrop-blur-2xl border border-white/50 dark:border-white/20 text-gray-900 dark:text-white hover:bg-white/95 dark:hover:bg-black/70 shadow-[0_4px_16px_0_rgba(31,38,135,0.4)] rounded-2xl">
                <Download className="mr-2 w-4 h-4" />
                Install App
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* iOS-style Floating elements for CTA */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-white/20 to-blue-400/30 rounded-full blur-3xl animate-pulse-slow shadow-[0_0_80px_20px_rgba(255,255,255,0.1)]"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-purple-600/20 rounded-full blur-3xl animate-pulse-slow shadow-[0_0_100px_25px_rgba(236,72,153,0.15)]" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 rounded-full blur-2xl animate-pulse-slow shadow-[0_0_60px_15px_rgba(34,211,238,0.1)]" style={{ animationDelay: "2s" }}></div>
      </section>

      <Footer />
      </div>
    </>
  );
}
