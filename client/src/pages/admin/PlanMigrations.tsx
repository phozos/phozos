import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import MigrationManagementPanel from "@/components/admin/MigrationManagementPanel";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function PlanMigrations() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';

  if (authLoading) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24 space-y-6">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-64" />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <AppShell />
      <div className="container mx-auto p-6 pt-24 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plan Migrations</h1>
            <p className="text-gray-600 mt-2">
              Manage and track subscriber migrations between subscription plans
            </p>
          </div>
        </div>

        <MigrationManagementPanel />
      </div>
    </>
  );
}
