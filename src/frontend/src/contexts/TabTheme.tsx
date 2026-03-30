import { createContext, useContext } from "react";
import type { TabId } from "../components/Sidebar";

export interface TabTheme {
  accent: string;
  bg: string;
  glow: string;
  glow2: string;
  gradient: string;
}

export const TAB_THEMES: Record<TabId, TabTheme> = {
  today: {
    accent: "#60a5fa",
    bg: "#060d1a",
    glow: "rgba(96,165,250,0.25)",
    glow2: "rgba(99,102,241,0.15)",
    gradient:
      "linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(99,102,241,0.06) 50%, transparent 100%)",
  },
  timetable: {
    accent: "#a78bfa",
    bg: "#09060f",
    glow: "rgba(167,139,250,0.25)",
    glow2: "rgba(99,102,241,0.15)",
    gradient:
      "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(99,102,241,0.07) 50%, transparent 100%)",
  },
  attendance: {
    accent: "#818cf8",
    bg: "#07060f",
    glow: "rgba(129,140,248,0.25)",
    glow2: "rgba(99,102,241,0.15)",
    gradient:
      "linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(99,102,241,0.07) 50%, transparent 100%)",
  },
  calendar: {
    accent: "#60a5fa",
    bg: "#060b18",
    glow: "rgba(96,165,250,0.25)",
    glow2: "rgba(6,182,212,0.15)",
    gradient:
      "linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(6,182,212,0.07) 50%, transparent 100%)",
  },
  exams: {
    accent: "#c084fc",
    bg: "#09060f",
    glow: "rgba(192,132,252,0.25)",
    glow2: "rgba(139,92,246,0.15)",
    gradient:
      "linear-gradient(135deg, rgba(192,132,252,0.12) 0%, rgba(139,92,246,0.07) 50%, transparent 100%)",
  },
  tasks: {
    accent: "#06b6d4",
    bg: "#06090f",
    glow: "rgba(6,182,212,0.25)",
    glow2: "rgba(99,102,241,0.15)",
    gradient:
      "linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(99,102,241,0.07) 50%, transparent 100%)",
  },
  settings: {
    accent: "#a78bfa",
    bg: "#07060f",
    glow: "rgba(167,139,250,0.25)",
    glow2: "rgba(99,102,241,0.15)",
    gradient:
      "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(99,102,241,0.07) 50%, transparent 100%)",
  },
};

const TabThemeContext = createContext<TabTheme>(TAB_THEMES.today);

export function useTabTheme() {
  return useContext(TabThemeContext);
}

export { TabThemeContext };
