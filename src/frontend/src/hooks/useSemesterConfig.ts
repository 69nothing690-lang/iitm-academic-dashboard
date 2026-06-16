// SemesterConfig shape as used by CalendarView and ExamsView.
// The backend hook is stubbed out — pages fall back to local SemSettings when semConfig is null.
export interface SemesterConfig {
  year: string | number;
  semType: string;
  classStart: string;
  classEnd: string;
  quiz1Start: string;
  quiz1End: string;
  quiz2Start: string;
  quiz2End: string;
  endSemStart: string;
  endSemEnd: string;
  holidays: Array<{ date: string; name: string; type?: string }>;
  slotExamDates: Array<{
    slot: string;
    quiz1: string;
    quiz2: string;
    endSem: string;
  }>;
}

// useSemesterConfig — returns null; CalendarView/ExamsView fall back to app-level semSettings.
export function useSemesterConfig() {
  return {
    semConfig: null as SemesterConfig | null,
    loading: false,
  };
}
