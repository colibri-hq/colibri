import { browser } from "$app/environment";
import { generateRandomUuid } from "@colibri-hq/shared";
import { toast } from "svelte-sonner";
import { derived, get, writable } from "svelte/store";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

export interface NotificationOptions {
  level?: NotificationLevel;
  message?: string;
  duration?: number;
}

const defaultDurations: Record<NotificationLevel, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 8000,
};

const key = "colibri.notifications";
const initialValue: Notification[] = browser
  ? deserialize(sessionStorage.getItem(key) || "[]")
  : [];

const store = writable<Notification[]>(initialValue);

const exportedNotifications = derived(store, (s) => s);
export { exportedNotifications as notifications };

export const unreadCount = derived(store, (s) => s.filter((n) => !n.read).length);

if (browser) {
  store.subscribe((value) => sessionStorage.setItem(key, serialize(value)));

  window.addEventListener("storage", (event) => {
    if (event.key === key) {
      store.set(deserialize(event.newValue || "[]"));
    }
  });
}

function serialize(value: Notification[]): string {
  return JSON.stringify(value);
}

function deserialize(value: string): Notification[] {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export function notify(title: string, options: NotificationOptions = {}): string {
  const { level = "info", message, duration } = options;
  const id = generateRandomUuid();
  const notification: Notification = {
    id,
    level,
    title,
    message,
    timestamp: Date.now(),
    read: false,
  };

  store.update((notifications) => [notification, ...notifications]);

  const toastDuration = duration ?? defaultDurations[level];
  const toastOptions = { id, description: message, duration: toastDuration };

  switch (level) {
    case "success":
      toast.success(title, toastOptions);
      break;
    case "error":
      toast.error(title, toastOptions);
      break;
    case "warning":
      toast.warning(title, toastOptions);
      break;
    case "info":
    default:
      toast.info(title, toastOptions);
      break;
  }

  return id;
}

export function success(title: string, options: Omit<NotificationOptions, "level"> = {}): string {
  return notify(title, { ...options, level: "success" });
}

export function error(title: string, options: Omit<NotificationOptions, "level"> = {}): string {
  return notify(title, { ...options, level: "error" });
}

export function warning(title: string, options: Omit<NotificationOptions, "level"> = {}): string {
  return notify(title, { ...options, level: "warning" });
}

export function info(title: string, options: Omit<NotificationOptions, "level"> = {}): string {
  return notify(title, { ...options, level: "info" });
}

export function markAsRead(id: string): void {
  store.update((notifications) =>
    notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  );
}

export function markAllAsRead(): void {
  store.update((notifications) => notifications.map((n) => ({ ...n, read: true })));
}

export function clearHistory(): void {
  store.set([]);
}

export function getNotifications(): Notification[] {
  return get(store);
}
