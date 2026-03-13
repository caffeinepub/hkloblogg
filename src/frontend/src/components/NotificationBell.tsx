import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Notification } from "../backend.d";
import {
  useAllNotifications,
  useMarkNotificationsRead,
  useUnreadNotifications,
} from "../hooks/useQueries";
import { useLanguage } from "../i18n/LanguageContext";
import type { NavigateFn } from "../types";

function formatRelativeTime(timestamp: bigint, t: (k: any) => string): string {
  const ms = Number(timestamp) / 1_000_000;
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return t("notif_just_now");
  if (minutes < 60) return `${minutes} ${t("notif_min_ago")}`;
  if (hours < 24) return `${hours} ${t("notif_h_ago")}`;
  return `${days} ${days !== 1 ? t("notif_days_ago") : t("notif_day_ago")}`;
}

function NotificationItem({
  notif,
  onNavigate,
  onClose,
  t,
}: {
  notif: Notification;
  onNavigate: NavigateFn;
  onClose: () => void;
  t: (k: any) => string;
}) {
  const isFollow = notif.notifType === "follow";

  const handleClick = () => {
    onClose();
    if (notif.link?.startsWith("profile:")) {
      const principalId = notif.link.replace("profile:", "");
      onNavigate({ type: "profile", principalId });
    } else if (notif.link?.startsWith("post:")) {
      const postId = BigInt(notif.link.replace("post:", ""));
      onNavigate({ type: "post", postId });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors text-left ${
        notif.read ? "opacity-70" : ""
      }`}
    >
      <div
        className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isFollow
            ? "bg-primary/15 text-primary"
            : "bg-amber-100 text-amber-600"
        }`}
      >
        {isFollow ? (
          <UserPlus className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body text-foreground leading-snug">
          {notif.message}
        </p>
        <p className="text-xs text-muted-foreground font-body mt-0.5">
          {formatRelativeTime(notif.timestamp, t)}
        </p>
      </div>
      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
      )}
    </button>
  );
}

export default function NotificationBell({
  onNavigate,
}: {
  onNavigate: NavigateFn;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { data: unread = [] } = useUnreadNotifications();
  const { data: allNotifs = [] } = useAllNotifications();
  const markRead = useMarkNotificationsRead();

  const unreadCount = unread.length;

  const markReadMutate = markRead.mutate;
  const handleMarkRead = useCallback(() => {
    markReadMutate();
  }, [markReadMutate]);

  useEffect(() => {
    if (open && unreadCount > 0) {
      handleMarkRead();
    }
  }, [open, unreadCount, handleMarkRead]);

  const sorted = useMemo(
    () =>
      [...allNotifs]
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .slice(0, 20),
    [allNotifs],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-ocid="nav.notifications.button"
          className="relative p-2 rounded-lg hover:bg-accent/50 transition-colors"
          aria-label={t("notif_title")}
        >
          <Bell className="w-5 h-5 text-foreground/70" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="notifications.popover"
        align="end"
        sideOffset={8}
        className="w-80 p-0 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-foreground">
            {t("notif_title")}
          </h3>
          {unreadCount > 0 && (
            <Button
              data-ocid="notifications.primary_button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
              onClick={handleMarkRead}
            >
              {t("notif_mark_read")}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
          {sorted.length === 0 ? (
            <div
              data-ocid="notifications.empty_state"
              className="flex flex-col items-center justify-center py-10 text-center px-4"
            >
              <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-body text-muted-foreground">
                {t("notif_none")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((notif) => (
                <NotificationItem
                  key={String(notif.id)}
                  notif={notif}
                  onNavigate={onNavigate}
                  onClose={() => setOpen(false)}
                  t={t}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
