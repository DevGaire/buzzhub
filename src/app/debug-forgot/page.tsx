"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugForgotPasswordPage() {
  const [email, setEmail] = useState("hendrygaire@gmail.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testForgotPassword = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/debug-forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setResult({ status: response.status, data });

    } catch (error) {
      console.error("Test error:", error);
      setResult({ error: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>🔍 Debug Forgot Password</CardTitle>
          <CardDescription>
            Test the forgot password functionality with detailed debugging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
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
            onClick={testForgotPassword} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "🧪 Test Forgot Password"}
          </Button>

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Debug Result:</h3>
              <div className="text-sm">
                <p><strong>Status:</strong> {result.status}</p>
                <pre className="mt-2 overflow-auto bg-white p-3 rounded border text-xs">
                  {JSON.stringify(result.data || result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>What this tests:</strong></p>
            <ul className="text-xs space-y-1 ml-4">
              <li>• User lookup in database</li>
              <li>• Password hash verification</li>
              <li>• Token generation and storage</li>
              <li>• SMTP connection</li>
              <li>• Email sending</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}