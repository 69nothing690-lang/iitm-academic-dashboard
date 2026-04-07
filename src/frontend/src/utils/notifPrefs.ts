// Notification preferences — shared between SettingsView and NotificationManager
export interface NotifPrefs {
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  classRemindersEnabled: boolean;
  classReminderMinutes: 5 | 10 | 15 | 30;
  examRemindersEnabled: boolean;
  examReminderTiming: "1d" | "3d" | "7d" | "all";
  taskRemindersEnabled: boolean;
  taskReminderTiming: "1d" | "2d" | "both";
  customReminders: Array<{
    id: string;
    date: string;
    time: string;
    description: string;
  }>;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  dailySummaryEnabled: true,
  dailySummaryTime: "07:00",
  classRemindersEnabled: true,
  classReminderMinutes: 10,
  examRemindersEnabled: true,
  examReminderTiming: "all",
  taskRemindersEnabled: true,
  taskReminderTiming: "both",
  customReminders: [],
};

export function getNotifPrefs(): NotifPrefs {
  try {
    const saved = localStorage.getItem("instiflow_notif_prefs");
    return saved
      ? { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(saved) }
      : DEFAULT_NOTIF_PREFS;
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}
