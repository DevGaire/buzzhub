"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DebugUsersPage() {
  const [users, setUsers] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug-users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>👥 Debug Users Database</CardTitle>
          <CardDescription>
            View all users in the database to identify the correct email for password reset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={fetchUsers} disabled={loading} className="w-full">
            {loading ? "Loading..." : "🔄 Refresh Users"}
          </Button>

          {users && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800">📊 Database Summary</h3>
                <p className="text-blue-700">Total Users: <strong>{users.totalUsers}</strong></p>
              </div>

              {users.totalUsers === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800">⚠️ No Users Found</h3>
                  <p className="text-yellow-700">
                    No users exist in the database. You need to create an account first:
                  </p>
                  <ul className="mt-2 text-sm text-yellow-600">
                    <li>• Go to <a href="/signup" className="underline">/signup</a> to create an account</li>
                    <li>• Or use <a href="/login" className="underline">/login</a> with Google OAuth</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-medium">👤 Users in Database:</h3>
                  {users.users.map((user: any, index: number) => (
                    <div key={user.id} className="border rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p><strong>Username:</strong> @{user.username}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Display Name:</strong> {user.displayName}</p>
                        </div>
                        <div>
                          <p><strong>Account Type:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              user.hasPassword 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.accountType}
                            </span>
                          </p>
                          <p><strong>Email Verified:</strong> 
                            <span className={`ml-2 ${user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                              {user.emailVerified ? '✅ Yes' : '❌ No'}
                            </span>
                          </p>
                          <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      {user.hasPassword ? (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                          <p className="text-green-800 text-sm">
                            ✅ <strong>Can reset password:</strong> This account has a password and can use forgot password feature.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-blue-800 text-sm">
                            ℹ️ <strong>OAuth Account:</strong> This account uses Google login and cannot reset password.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}