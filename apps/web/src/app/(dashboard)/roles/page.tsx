"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Users, Wrench, Eye } from "lucide-react";

const roles = [
  { name: "Administrator", description: "Full system access", icon: Shield, users: 2, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { name: "Support", description: "Customer support and diagnostics", icon: Users, users: 5, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { name: "Installer", description: "Device provisioning and configuration", icon: Wrench, users: 8, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { name: "Customer", description: "View own sites and devices", icon: Eye, users: 24, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
];

export default function RolesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Roles & Permissions"
        description="Manage role-based access control"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.name} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${role.bg}`}>
                    <role.icon className={`h-6 w-6 ${role.color}`} />
                  </div>
                  <div>
                    <CardTitle>{role.name}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{role.users} users assigned</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
