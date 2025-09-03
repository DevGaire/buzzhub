"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/PasswordInput";

export default function DebugLoginPage() {
  const [email, setEmail] = useState("gairedeverishi7@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/debug-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
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
          <CardTitle>🔍 Debug Login Credentials</CardTitle>
          <CardDescription>
            Test your login credentials to see exactly what's happening
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button 
            onClick={testLogin} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "🧪 Test Login Credentials"}
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

          <div className="text-sm text-gray-600 space-y-3">
            <div>
              <p><strong>What this tests:</strong></p>
              <ul className="text-xs space-y-1 ml-4">
                <li>• User lookup by email</li>
                <li>• Password hash existence</li>
                <li>• Password verification</li>
                <li>• Account type detection</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-800 mb-2">💡 Common Issues:</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Wrong email address</li>
                <li>• Password not saved correctly</li>
                <li>• OAuth account without password</li>
                <li>• Case sensitivity in email</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}