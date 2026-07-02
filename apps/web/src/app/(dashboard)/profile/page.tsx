"use client";

import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Profile" description="Manage your account settings" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              A
            </div>
            <CardTitle>Alice Johnson</CardTitle>
            <CardDescription>alice@sentience.io</CardDescription>
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/50 dark:text-purple-400">
                Administrator
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full">Change Avatar</Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="Alice Johnson" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="alice@sentience.io" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and MFA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <input type="password" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="••••••••" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <input type="password" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="New password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <input type="password" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Confirm password" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button>Update Password</Button>
                <Button variant="outline">Enable MFA</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
