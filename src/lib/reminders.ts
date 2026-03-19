import { supabase } from "./supabase";
import { format } from "date-fns";

export async function initReminders(userId: string) {
  if (typeof Notification === "undefined") return;

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission !== "granted") return;

  const { data: events } = await supabase
    .from("campus_events")
    .select("id, title, start_time, event_type")
    .eq("user_id", userId)
    .in("event_type", ["deadline", "exam"])
    .gte("start_time", new Date().toISOString())
    .lte("start_time", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("start_time", { ascending: true });

  if (!events) return;

  const now = new Date();

  events.forEach(event => {
    const eventTime = new Date(event.start_time);
    const hoursUntil = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntil = Math.floor(hoursUntil / 24);

    const key = `reminder-${event.id}`;
    const lastShown = localStorage.getItem(key);
    const lastShownDate = lastShown ? new Date(lastShown) : null;
    const alreadyShownToday = lastShownDate && lastShownDate.toDateString() === now.toDateString();

    if (alreadyShownToday) return;

    let shouldNotify = false;
    let message = "";

    if (daysUntil === 0 && hoursUntil <= 3) {
      shouldNotify = true;
      message = `⚡ Due in ${Math.round(hoursUntil)} hours!`;
    } else if (daysUntil === 1) {
      shouldNotify = true;
      message = "⏰ Due tomorrow — are you ready?";
    } else if (daysUntil === 3) {
      shouldNotify = true;
      message = "📅 Due in 3 days — start preparing!";
    } else if (daysUntil === 7) {
      shouldNotify = true;
      message = "🗓️ Due in 1 week — plan your study time.";
    }

    if (shouldNotify) {
      const notification = new Notification(`UniFlow: ${event.title}`, {
        body: message,
        icon: "/favicon.png",
        tag: key,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = "/calendar";
      };

      localStorage.setItem(key, now.toISOString());
    }
  });
}

export function clearReminderCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith("reminder-"))
    .forEach(k => localStorage.removeItem(k));
}
