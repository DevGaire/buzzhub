"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, Shield, Users, TrendingUp } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    current: true,
    features: [
      "Unlimited posts",
      "Basic analytics",
      "5 GB storage",
      "Standard support",
    ],
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "per month",
    current: false,
    popular: true,
    features: [
      "Everything in Free",
      "Advanced analytics",
      "50 GB storage",
      "Priority support",
      "No ads",
      "Custom themes",
      "Schedule posts",
    ],
  },
  {
    name: "Business",
    price: "$29.99",
    period: "per month",
    current: false,
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Team collaboration",
      "API access",
      "Custom domain",
      "Advanced moderation",
      "Dedicated support",
    ],
  },
];

export default function SubscriptionSettings() {
  const handleUpgrade = (plan: string) => {
    toast({
      description: `Upgrading to ${plan} plan...`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You're currently on the Free plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Free Plan</p>
                <p className="text-sm text-muted-foreground">
                  Basic features for personal use
                </p>
              </div>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? "border-primary shadow-lg" : ""}
          >
            {plan.popular && (
              <div className="flex justify-center">
                <Badge className="absolute -top-3 px-3 py-1">
                  Most Popular
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {plan.name === "Pro" && <Crown className="h-5 w-5 text-yellow-500" />}
                {plan.name === "Business" && <Shield className="h-5 w-5 text-purple-500" />}
              </CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {plan.current ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.name)}
                >
                  Upgrade to {plan.name}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Premium Features</CardTitle>
          <CardDescription>
            Unlock these features with a premium subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Boost Your Posts</p>
                <p className="text-sm text-muted-foreground">
                  Get 10x more visibility
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Advanced Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Detailed insights and metrics
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Team Collaboration</p>
                <p className="text-sm text-muted-foreground">
                  Manage multiple accounts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Enhanced Security</p>
                <p className="text-sm text-muted-foreground">
                  Advanced protection features
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}