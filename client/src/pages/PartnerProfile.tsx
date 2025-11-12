import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";

export default function PartnerProfile() {
  const { user } = useAuth();

  return (
    <>
      <AppShell />
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            Partner Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your partner account settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm"><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
              <p className="text-sm"><strong>Email:</strong> {user?.email}</p>
              <p className="text-muted-foreground mt-4">
                Full partner profile management features are currently under development.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
