import { useAuth } from "@/hooks/useAuth";
import { usePartnerDashboardStats } from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  TrendingUp, 
  DollarSign,
  Eye,
  CheckCircle,
  Link2,
  BarChart3,
  Plus,
  ArrowRight,
  Building2,
  Wallet
} from "lucide-react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = usePartnerDashboardStats();

  const kpiCards = [
    {
      title: "Total Referrals",
      value: stats?.totalReferrals || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      change: `+${stats?.currentMonthReferrals || 0} this month`,
    },
    {
      title: "Total Conversions",
      value: stats?.totalConversions || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      change: `+${stats?.currentMonthConversions || 0} this month`,
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      change: stats && stats.conversionRate > 10 ? "Above average" : "Keep going!",
    },
    {
      title: "Total Clicks",
      value: stats?.totalClicks || 0,
      icon: Eye,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      change: `${stats?.uniqueClicks || 0} unique`,
    },
    {
      title: "Commission Earned",
      value: `₹${stats?.totalCommissionEarned?.toLocaleString('en-IN') || 0}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      change: `₹${stats?.pendingCommission?.toLocaleString('en-IN') || 0} pending`,
    },
    {
      title: "Commission Paid",
      value: `₹${stats?.totalCommissionPaid?.toLocaleString('en-IN') || 0}`,
      icon: CheckCircle,
      color: "text-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
      change: "All time",
    },
    {
      title: "Active Links",
      value: stats?.activeLinks || 0,
      icon: Link2,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      change: "Currently active",
    },
    {
      title: "Click-to-Reg Rate",
      value: `${stats?.clickToRegistrationRate?.toFixed(1) || 0}%`,
      icon: BarChart3,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
      change: "Conversion efficiency",
    },
  ];

  return (
    <>
      <SEO 
        title="Partner Dashboard - Phozos"
        description="Track your referrals, commissions, and grow your partnership"
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 pt-16">
        <AppShell />
        
        <main className="container mx-auto px-4 pt-24 pb-8 space-y-8">
          <Card className="liquid-glass dark:liquid-glass-dark rounded-[3rem] p-8 md:p-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Welcome back, {user?.firstName || 'Partner'}!
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-2xl">
                  Track your referrals, commissions, and grow your partnership with Phozos
                </p>
                <div className="flex items-center space-x-4">
                  <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 shadow-lg">
                    <Building2 className="w-4 h-4 mr-2" />
                    Partner Dashboard
                  </Badge>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-lg">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verified Partner
                  </Badge>
                </div>
              </div>
              <div className="hidden md:block">
                <Avatar className="w-20 h-20 border-4 border-white/40 shadow-xl">
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-2xl font-bold">
                    {user?.firstName?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              kpiCards.map((card, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className={`p-2 ${card.bgColor} rounded-lg`}>
                        <card.icon className={`w-6 h-6 ${card.color}`} />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {card.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-2xl font-bold">{card.value}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      {card.change}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link2 className="w-5 h-5 mr-2" />
                  Referral Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Create and manage your referral links to track student sign-ups
                </p>
                <Button className="w-full" asChild>
                  <Link href="/dashboard/partner/referral-links">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Link
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Commissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  View pending and approved commissions from your referrals
                </p>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/dashboard/partner/commissions">
                    View Commissions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  Payouts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Request payouts and track payment history
                </p>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/dashboard/partner/payouts">
                    Request Payout
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
