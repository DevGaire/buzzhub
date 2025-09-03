"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testEmail = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        description: "Please enter an email address"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setResult(data);

      if (response.ok) {
        toast({
          description: "Test email sent successfully! Check your inbox."
        });
      } else {
        toast({
          variant: "destructive",
          description: data.error || "Failed to send test email"
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      toast({
        variant: "destructive",
        description: "Network error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🧪 Email Configuration Test</CardTitle>
          <CardDescription>
            Test if your email configuration is working properly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Test Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button 
            onClick={testEmail} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Sending..." : "Send Test Email"}
          </Button>

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Test Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Current SMTP Config:</strong></p>
            <ul className="text-xs space-y-1">
              <li>Host: smtp.gmail.com</li>
              <li>Port: 587</li>
              <li>User: hendrygaire@gmail.com</li>
              <li>From: Buzzhub &lt;hendrygaire@gmail.com&gt;</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}