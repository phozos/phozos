import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, RefreshCw, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";

interface InvitationLink {
  id: string;
  token: string;
  url: string;
  isActive: boolean;
  usedCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function StaffInvitationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch invitation links
  const { data: invitationLinks, isLoading } = useApiQuery(
    ["/api/admin/staff-invitation-links"],
    "/api/admin/staff-invitation-links",
    undefined,
    { retry: false }
  );

  // Create new invitation link
  const createLinkMutation = useApiMutation(
    async () => {
      return api.post("/api/admin/staff-invitation-links");
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-invitation-links"] });
        toast({
          title: "Success",
          description: "New invitation link created successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create invitation link",
          variant: "destructive",
        });
      },
    }
  );

  // Refresh invitation link
  const refreshLinkMutation = useApiMutation(
    async (linkId: string) => {
      return api.put(`/api/admin/staff-invitation-links/${linkId}/refresh`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-invitation-links"] });
        toast({
          title: "Success",
          description: "Invitation link refreshed successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to refresh invitation link",
          variant: "destructive",
        });
      },
    }
  );

  const copyToClipboard = async (url: string, token: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading invitation links...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Staff Invitation Links
          <Button
            onClick={() => createLinkMutation.mutate()}
            disabled={createLinkMutation.isPending}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {createLinkMutation.isPending ? "Creating..." : "Create New Link"}
          </Button>
        </CardTitle>
        <CardDescription>
          Manage invitation links for staff members. Links do not expire unless refreshed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Note:</strong> Share invitation links only with trusted staff members. 
            Anyone with the link can create a staff account.
          </AlertDescription>
        </Alert>

        {!invitationLinks || invitationLinks.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No invitation links found. Create your first link to invite staff members.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {invitationLinks.map((link: InvitationLink) => (
              <Card key={link.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${link.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {link.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Used {link.usedCount} times
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded p-2 font-mono text-sm break-all">
                        {link.url}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>Created: {formatDate(link.createdAt)}</span>
                        {link.lastUsedAt && (
                          <span>Last used: {formatDate(link.lastUsedAt)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(link.url, link.token)}
                        disabled={copiedToken === link.token}
                      >
                        {copiedToken === link.token ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshLinkMutation.mutate(link.id)}
                        disabled={refreshLinkMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshLinkMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}