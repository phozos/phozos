import React from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionConversionTest } from "@/components/SubscriptionConversionTest";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TestTube, Zap, Users, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function ConversionTest() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/admin">
              <Button variant="outline" size="sm" data-testid="button-back-to-admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <TestTube className="h-8 w-8 text-blue-600" />
                Conversion Testing
                <Badge variant="secondary">Demo</Badge>
              </h1>
              <p className="text-muted-foreground mt-2">
                Test the automatic subscription conversion tracking system
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Component */}
          <div className="space-y-6">
            <SubscriptionConversionTest currentUserId={user?.id} />
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  How It Works
                </CardTitle>
                <CardDescription>
                  Automatic conversion tracking workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-300">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Student Purchase</h4>
                      <p className="text-sm text-muted-foreground">
                        Student buys a subscription plan through your payment system
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-300">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Automatic Detection</h4>
                      <p className="text-sm text-muted-foreground">
                        System automatically creates a follow-up with "converted_online" status
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-300">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Counselor Assignment</h4>
                      <p className="text-sm text-muted-foreground">
                        If no counselor assigned, system automatically assigns one
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-semibold text-green-600 dark:text-green-300">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Instant Notification</h4>
                      <p className="text-sm text-muted-foreground">
                        Counselor receives real-time notification about the conversion
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Integration Options
                </CardTitle>
                <CardDescription>
                  Multiple ways to trigger conversions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm">Internal API Call</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      POST /api/subscription/conversion
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For payments processed within your platform
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm">External Webhook</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      POST /api/webhooks/subscription
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For third-party payment processors (Stripe, PayPal, etc.)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                  Conversion Types
                </CardTitle>
                <CardDescription>
                  Different conversion statuses and workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm font-medium">converted_online</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Auto-Approved
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm font-medium">converted_offline</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    Needs Approval
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Online conversions are automatically approved, while offline conversions require admin approval with payment verification.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}