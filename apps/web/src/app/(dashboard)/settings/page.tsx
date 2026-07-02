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
import { Settings, Globe, Shield, Bell, Key, Palette, Database, RefreshCw } from "lucide-react";

const sections = [
  { name: "General", desc: "Platform name, logo, branding", icon: Globe },
  { name: "Security", desc: "Password policy, MFA, session timeout", icon: Shield },
  { name: "Notifications", desc: "Email, push, SMS configuration", icon: Bell },
  { name: "API Keys", desc: "Manage API keys for integrations", icon: Key },
  { name: "Appearance", desc: "Theme, colors, logo", icon: Palette },
  { name: "Data Management", desc: "Retention policies, backups", icon: Database },
  { name: "MQTT Broker", desc: "Broker connection settings", icon: RefreshCw },
  { name: "Integrations", desc: "Webhooks, third-party services", icon: Settings },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Configure platform settings and preferences"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.name} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{section.name}</CardTitle>
                  <CardDescription>{section.desc}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
