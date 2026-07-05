"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  Info,
  Monitor,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-notifications";
import type { NotificationCategory, NotificationPriority } from "@sentience/types";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  alert: AlertTriangle,
  device: Monitor,
  system: Info,
  report: FileText,
  user: Bell,
  maintenance: Bell,
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-blue-500",
  low: "bg-slate-400",
};

const categoryLabels: Record<string, string> = {
  alert: "Alert",
  device: "Device",
  system: "System",
  report: "Report",
  user: "User",
  maintenance: "Maintenance",
};

const priorityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filterRead, setFilterRead] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);

  const { data, isLoading, isError } = useNotifications({
    isRead: filterRead,
    category: filterCategory,
    page,
    limit: 20,
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const unreadCount = data?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        description="Stay informed about your IoT estate"
        actions={
          <div className="flex items-center gap-2">
            {/* Filter: Read status */}
            <select
              value={filterRead ?? ""}
              onChange={(e) => { setFilterRead(e.target.value || undefined); setPage(1); }}
              className="h-9 rounded-md border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by read status"
            >
              <option value="">All notifications</option>
              <option value="false">Unread only</option>
              <option value="true">Read only</option>
            </select>
            {/* Filter: Category */}
            <select
              value={filterCategory ?? ""}
              onChange={(e) => { setFilterCategory(e.target.value || undefined); setPage(1); }}
              className="h-9 rounded-md border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Mark All Read ({unreadCount})
              </Button>
            )}
          </div>
        }
      />

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <EmptyState
          icon={BellOff}
          title="Failed to load notifications"
          description="Could not reach the server. Please try again later."
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && notifications.length === 0 && (
        <EmptyState
          icon={BellOff}
          title={filterRead === "false" ? "No unread notifications" : "No notifications"}
          description={
            filterRead === "false" || filterCategory
              ? "Try adjusting your filters to see more notifications."
              : "You have no notifications at this time. Notifications will appear here when there is activity."
          }
          action={
            filterRead === "false" || filterCategory
              ? { label: "Clear filters", onClick: () => { setFilterRead(undefined); setFilterCategory(undefined); } }
              : undefined
          }
        />
      )}

      {/* Notifications List */}
      {!isLoading && !isError && notifications.length > 0 && (
        <>
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = categoryIcons[n.category] || Bell;
              return (
                <Card
                  key={n.id}
                  className={`transition-colors ${!n.isRead ? "border-primary/30 bg-primary/[0.02]" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${
                        !n.isRead ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <Icon className={`h-4 w-4 ${!n.isRead ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                          <p className="text-sm font-medium">{n.title}</p>
                          <span className={`ml-auto h-2 w-2 rounded-full ${priorityColors[n.priority]}`} />
                        </div>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {categoryLabels[n.category] ?? n.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {priorityLabels[n.priority] ?? n.priority}
                          </Badge>
                        </div>
                      </div>
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs"
                          onClick={() => handleMarkRead(n.id)}
                          disabled={markRead.isPending}
                        >
                          {markRead.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCheck className="h-3 w-3" />
                          )}
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} notifications)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (pagination.totalPages ?? 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
