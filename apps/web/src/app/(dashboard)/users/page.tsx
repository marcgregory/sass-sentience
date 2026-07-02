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
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Mail, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";

const users = [
  { id: "USR-001", name: "Alice Johnson", email: "alice@sentience.io", role: "admin", status: "active", lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: "USR-002", name: "Bob Smith", email: "bob@sentience.io", role: "support", status: "active", lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "USR-003", name: "Carol Davis", email: "carol@sentience.io", role: "installer", status: "active", lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: "USR-004", name: "Dan Wilson", email: "dan@customer.com", role: "customer", status: "active", lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "USR-005", name: "Eve Martin", email: "eve@customer.com", role: "customer", status: "inactive", lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
];

const roleStyles: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400",
  support: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400",
  installer: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400",
  customer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
};

export default function UsersPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="User Management"
        description="Manage users, roles, and permissions"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4" />
              Invite User
            </Button>
            <Button>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border">
        <div className="divide-y">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {user.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyles[user.role]}`}>
                  {user.role}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.status === "active"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  {user.status}
                </span>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  {formatRelativeTime(user.lastLogin)}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
