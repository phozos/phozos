import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Building2 } from "lucide-react";

export default function PartnerDashboard() {
  const { user } = useAuth();

  return (
    <>
      <AppShell />
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            Partner Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.firstName || 'Partner'}!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Partner Dashboard Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The partner dashboard is currently under development. You'll be able to view your
              referrals, commissions, and performance metrics here.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
