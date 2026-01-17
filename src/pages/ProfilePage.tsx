import React, { useMemo, useState } from "react";
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the centralized logout function
      await logout();
      
      // Navigate to auth page
      navigate('/auth');
      
    } catch (error: any) {
      console.error('Error logging out:', error);
      setError(error.message || 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  const profileName = useMemo(
    () =>
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "User",
    [user]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <Card className="flex-1 border-none shadow-none lg:max-w-md">
            <CardHeader className="flex flex-col items-center text-center">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={profileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-heading-1 text-slate-500">
                    {profileName[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <CardTitle className="mt-4 text-slate-900">
                {profileName}
              </CardTitle>
              <p className="text-body-sm text-slate-500">{user?.email || "user@example.com"}</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-body-xs uppercase tracking-wide text-slate-500">Account</p>
                <p className="mt-2 text-body-medium text-slate-900">Member since</p>
                <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-body-xs uppercase tracking-wide text-slate-500">User ID</p>
                <p className="mt-2 font-mono text-body-sm text-slate-900">
                  {user?.id || "Not available"}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={loading}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {loading ? "Signing Out..." : "Sign Out"}
              </Button>
              {error && <p className="text-body-sm text-red-600">Error: {error}</p>}
            </CardFooter>
          </Card>

          <div className="flex-1 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-body-xs-semibold uppercase tracking-wide text-slate-500">
                    Full Name
                  </p>
                  <p className="text-body-sm text-slate-900">{profileName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-body-xs-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  <p className="text-body-sm text-slate-900">{user?.email || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-body-xs-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </p>
                  <p className="text-body-sm text-slate-900">{user?.app_metadata?.role || "Member"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-body-xs-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <p className="text-body-sm text-slate-900">Active</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-body-sm-semibold text-slate-900">Password</p>
                    <p className="text-body-xs text-slate-500">Last changed recently</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-body-sm-semibold text-slate-900">Two-factor authentication</p>
                    <p className="text-body-xs text-slate-500">Add extra layer of security</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage; 