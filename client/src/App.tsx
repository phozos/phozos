import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useRoute } from "wouter";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HelmetProvider } from "react-helmet-async";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import Profile from "@/pages/Profile";
import TeamDashboard from "@/pages/TeamDashboard";
import AdminProfile from "@/pages/AdminProfile";
import CounselorProfile from "@/pages/CounselorProfile";
import CompanyProfile from "@/pages/CompanyProfile";
import PartnerDashboard from "@/pages/PartnerDashboard";
import PartnerProfile from "@/pages/PartnerProfile";
import PartnerRegistration from "@/pages/PartnerRegistration";
import PartnerReferralLinks from "@/pages/PartnerReferralLinks";
import PartnerCommissions from "@/pages/PartnerCommissions";
import PartnerPayouts from "@/pages/PartnerPayouts";
import Auth from "@/pages/Auth";
import StaffInvite from "@/pages/StaffInvite";
import StudentProfileDetail from "@/pages/StudentProfileDetail";
import SubscriptionPlans from "@/pages/SubscriptionPlans";
import PublicPlans from "@/pages/PublicPlans";
import ConversionTest from "@/pages/ConversionTest";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import CookiePolicy from "@/pages/CookiePolicy";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import { CookieBanner } from "@/components/CookieConsent";

// FID Optimization: Lazy load heavy components for better initial load performance
// This reduces the main bundle size and improves First Input Delay (FID)
// Heavy dashboard components with large dependency trees
const Community = lazy(() => import("@/pages/Community"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const SubscriptionAnalytics = lazy(() => import("@/pages/admin/SubscriptionAnalytics"));
const PlanAnalytics = lazy(() => import("@/pages/admin/PlanAnalytics"));
const PlanMigrations = lazy(() => import("@/pages/admin/PlanMigrations"));
const FeatureManagementDashboard = lazy(() => import("@/pages/admin/FeatureManagementDashboard"));
const PartnerManagement = lazy(() => import("@/pages/admin/PartnerManagement"));
const CommissionManagement = lazy(() => import("@/pages/admin/CommissionManagement"));
const PayoutProcessing = lazy(() => import("@/pages/admin/PayoutProcessing"));
const PartnerAnalytics = lazy(() => import("@/pages/admin/PartnerAnalytics"));
const StudentChat = lazy(() => import("@/pages/StudentChat"));
const CompanyDashboard = lazy(() => import("@/pages/CompanyDashboard"));
// Feature-heavy pages that aren't critical for initial render
const Universities = lazy(() => import("@/pages/Universities"));
const Applications = lazy(() => import("@/pages/Applications"));
const Documents = lazy(() => import("@/pages/Documents"));



// CLS Optimization: Loading fallback component for Suspense
// Reserve minimum height to prevent layout shift when content loads
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <div className="skeleton-line w-48"></div>
    </div>
  </div>
);

// Referral Redirect Component - handles /ref/:code route
const ReferralRedirect = () => {
  const [, params] = useRoute("/ref/:code");
  
  useEffect(() => {
    if (params?.code) {
      window.location.href = `/api/ref/${params.code}`;
    }
  }, [params]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Processing referral link...</p>
      </div>
    </div>
  );
};

function AppContent() {
  const { user } = useAuth();

  // Phase 4: Consolidated protection patterns for cleaner routing
  const customerOnly = { allowedUserTypes: ['customer'] as ('customer' | 'team_member' | 'company_profile' | 'partner')[] };
  const companyOnly = { allowedUserTypes: ['company_profile'] as ('customer' | 'team_member' | 'company_profile' | 'partner')[] };
  const teamMemberOnly = { allowedUserTypes: ['team_member'] as ('customer' | 'team_member' | 'company_profile' | 'partner')[] };
  const partnerOnly = { allowedUserTypes: ['partner'] as ('customer' | 'team_member' | 'company_profile' | 'partner')[] };
  const adminOnly = { allowedUserTypes: ['team_member'] as ('customer' | 'team_member' | 'company_profile' | 'partner')[], allowedRoles: ['admin'] };
  const counselorOnly = { allowedUserTypes: ['team_member'] as ('customer' | 'team_member' | 'company_profile' | 'partner')[], allowedRoles: ['counselor'] };
  const anyAuth = { allowedUserTypes: ['customer', 'team_member', 'company_profile', 'partner'] as ('customer' | 'team_member' | 'company_profile' | 'partner')[] };

  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/ref/:code" component={ReferralRedirect} />
        <Route path="/" component={Home} />
        <Route path="/auth" component={Auth} />
        <Route path="/auth/staff-invite/:token" component={StaffInvite} />
        <Route path="/plans" component={PublicPlans} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />

        {/* Dashboard routes with consolidated protection patterns */}
        <Route path="/dashboard/student">
          <ProtectedRoute {...customerOnly}>
            <StudentDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/company">
          <ProtectedRoute {...companyOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <CompanyDashboard />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/team">
          <ProtectedRoute {...teamMemberOnly}>
            <TeamDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/team/student/:studentId">
          <ProtectedRoute {...teamMemberOnly}>
            <StudentProfileDetail />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/admin">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/admin/analytics">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <SubscriptionAnalytics />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/admin/plan-analytics">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <PlanAnalytics />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/admin/features">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <FeatureManagementDashboard />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/admin/migrations">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <PlanMigrations />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/admin/profile">
          <ProtectedRoute {...adminOnly}>
            <AdminProfile />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/admin/partners">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <PartnerManagement />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/admin/commissions">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <CommissionManagement />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/admin/payouts">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <PayoutProcessing />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/admin/partner-analytics">
          <ProtectedRoute {...adminOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <PartnerAnalytics />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/counselor/profile">
          <ProtectedRoute {...counselorOnly}>
            <CounselorProfile />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/company/profile">
          <ProtectedRoute {...companyOnly}>
            <CompanyProfile />
          </ProtectedRoute>
        </Route>

        {/* Partner Routes */}
        <Route path="/dashboard/partner">
          <ProtectedRoute {...partnerOnly}>
            <PartnerDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/partner/profile">
          <ProtectedRoute {...partnerOnly}>
            <PartnerProfile />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/partner/referral-links">
          <ProtectedRoute {...partnerOnly}>
            <PartnerReferralLinks />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/partner/commissions">
          <ProtectedRoute {...partnerOnly}>
            <PartnerCommissions />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard/partner/payouts">
          <ProtectedRoute {...partnerOnly}>
            <PartnerPayouts />
          </ProtectedRoute>
        </Route>

        <Route path="/partner/register">
          <PartnerRegistration />
        </Route>

        <Route path="/test/conversions">
          <ProtectedRoute {...adminOnly}>
            <ConversionTest />
          </ProtectedRoute>
        </Route>

        {/* General routes with simplified protection patterns */}
        <Route path="/dashboard">
          <ProtectedRoute allowedUserTypes={['customer', 'company_profile']}>
            {user?.userType === 'company_profile' ? (
              <Suspense fallback={<LoadingFallback />}>
                <CompanyDashboard />
              </Suspense>
            ) : (
              <StudentDashboard />
            )}
          </ProtectedRoute>
        </Route>

        <Route path="/profile">
          <ProtectedRoute {...anyAuth}>
            <Profile />
          </ProtectedRoute>
        </Route>

        <Route path="/universities">
          <ProtectedRoute {...anyAuth}>
            <Suspense fallback={<LoadingFallback />}>
              <Universities />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/applications">
          <ProtectedRoute {...customerOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <Applications />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/documents">
          <ProtectedRoute {...customerOnly}>
            <Suspense fallback={<LoadingFallback />}>
              <Documents />
            </Suspense>
          </ProtectedRoute>
        </Route>

        <Route path="/community">
          <ProtectedRoute {...anyAuth}>
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <Community />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        </Route>

        <Route path="/student/chat">
          <ProtectedRoute allowedUserTypes={['customer', 'company_profile']}>
            <Suspense fallback={<LoadingFallback />}>
              <StudentChat />
            </Suspense>
          </ProtectedRoute>
        </Route>

        {/* Legal & Compliance Pages */}
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/cookie-policy" component={CookiePolicy} />

        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <HelmetProvider>
              <AuthProvider>
                <AppContent />
                <Toaster />
                <CookieBanner />
              </AuthProvider>
            </HelmetProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
