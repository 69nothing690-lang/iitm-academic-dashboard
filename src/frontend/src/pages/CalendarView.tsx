import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { GlassCard } from "../components/GlassCard";
import { useSemesterConfig } from "../hooks/useSemesterConfig";
import type { Course, SemSettings, Task } from "../types";
import { getHolidaysForSem, isHoliday } from "../utils/holidays";
import type { Holiday } from "../utils/holidays";
import { getSemCalendar, isExamPeriod } from "../utils/semester";
import type { SemCalendar } from "../utils/semester";
import { getClassesOnDay } from "../utils/slots";

interface Props {
  courses: Course[];
  tasks: Task[];
  semSettings: SemSettings;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_HDRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEGEND: [string, string][] = [
  ["#6366f1", "Classes"],
  ["#8b5cf6", "Tasks"],
  ["#06b6d4", "Exams"],
  ["rgba(242,201,76,0.8)", "Holiday"],
];

export function CalendarView({ courses, tasks, semSettings }: Props) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { semConfig } = useSemesterConfig();

  let cal: SemCalendar;
  let holidays: Holiday[];

  if (semConfig) {
    cal = {
      year: Number(semConfig.year),
      semType: semConfig.semType as "even" | "odd",
      classStart: semConfig.classStart,
      classEnd: semConfig.classEnd,
      quiz1Start: semConfig.quiz1Start,
      quiz1End: semConfig.quiz1End,
      quiz2Start: semConfig.quiz2Start,
      quiz2End: semConfig.quiz2End,
      endSemStart: semConfig.endSemStart,
      endSemEnd: semConfig.endSemEnd,
    };
    holidays = semConfig.holidays;
  } else {
    cal = getSemCalendar(semSettings.year, semSettings.semType);
    holidays = getHolidaysForSem(semSettings.year, semSettings.semType);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const getDateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const getDayDots = (d: number) => {
    const ds = getDateStr(d);
    const dow = new Date(year, month, d).getDay();
    const dots: string[] = [];
    if (isHoliday(ds, holidays)) dots.push("rgba(242,201,76,0.8)");
    if (
      getClassesOnDay(dow, courses).length > 0 &&
      !isHoliday(ds, holidays) &&
      ds <= cal.classEnd
    )
      dots.push("#6366f1");
    if (tasks.some((t) => t.date === ds)) dots.push("#8b5cf6");
    if (isExamPeriod(ds, cal)) dots.push("#06b6d4");
    return dots;
  };

  const selDateObj = selectedDate ? new Date(`${selectedDate}T12:00`) : null;
  const selDow = selDateObj?.getDay() ?? 0;
  const selClasses = selectedDate ? getClassesOnDay(selDow, courses) : [];
  const selTasks = selectedDate
    ? tasks.filter((t) => t.date === selectedDate)
    : [];
  const selHoliday = selectedDate
    ? isHoliday(selectedDate, holidays)
    : undefined;
  const selExam = selectedDate ? isExamPeriod(selectedDate, cal) : null;

  const isAfterClassEnd = selectedDate ? selectedDate > cal.classEnd : false;
  const isLastDayOfClasses = selectedDate === cal.classEnd;
  const showClasses = selClasses.length > 0 && !isAfterClassEnd;

  // Build padding cells with stable keys derived from year/month
  const padKeys = Array.from(
    { length: firstDay },
    (_, i) => `pad-${year}-${month}-${i + 1}`,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: "32px 28px" }}
    >
      <h2
        className="page-heading-gradient"
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 24,
          letterSpacing: "-0.3px",
        }}
      >
        Calendar
      </h2>

      <div
        className="calendar-layout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: selectedDate ? "1fr 310px" : "1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <GlassCard>
          {/* Month nav */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <motion.button
              data-ocid="calendar.pagination_prev"
              whileTap={{ scale: 0.95 }}
              onClick={prevMonth}
              className="glass-btn"
              style={{ padding: "6px 14px", fontSize: 16, lineHeight: 1 }}
            >
              ‹
            </motion.button>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#F0F4FF" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <motion.button
              data-ocid="calendar.pagination_next"
              whileTap={{ scale: 0.95 }}
              onClick={nextMonth}
              className="glass-btn"
              style={{ padding: "6px 14px", fontSize: 16, lineHeight: 1 }}
            >
              ›
            </motion.button>
          </div>

          {/* Day headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 4,
            }}
          >
            {DAY_HDRS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: d === "Sun" || d === "Sat" ? "#503C50" : "#3D4460",
                  fontWeight: 700,
                  padding: "4px 0",
                  letterSpacing: "0.04em",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 3,
            }}
          >
            {padKeys.map((k) => (
              <div key={k} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const ds = getDateStr(d);
              const dots = getDayDots(d);
              const isToday = ds === today;
              const isSel = ds === selectedDate;
              const dow = new Date(year, month, d).getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <motion.button
                  key={ds}
                  data-ocid={`calendar.item.${d}`}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(isSel ? null : ds)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "7px 3px",
                    borderRadius: 9,
                    border: isSel
                      ? "1px solid rgba(99,102,241,0.6)"
                      : isToday
                        ? "1px solid rgba(255,255,255,0.18)"
                        : "1px solid transparent",
                    background: isSel
                      ? "rgba(99,102,241,0.2)"
                      : isToday
                        ? "rgba(255,255,255,0.07)"
                        : "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: isToday
                        ? "#a78bfa"
                        : isWeekend
                          ? "#3D4460"
                          : "#C8D0E8",
                      fontWeight: isToday ? 800 : 400,
                    }}
                  >
                    {d}
                  </span>
                  <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                    {dots.slice(0, 3).map((col) => (
                      <div
                        key={col}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: col,
                        }}
                      />
                    ))}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {LEGEND.map(([c, l]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "#6B7590",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: c,
                  }}
                />
                {l}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Day detail panel */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, x: 30, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.97 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <GlassCard
                style={{
                  borderColor: "rgba(99,102,241,0.3)",
                  boxShadow:
                    "0 0 24px rgba(99,102,241,0.1), 0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#F0F4FF",
                    }}
                  >
                    {new Date(`${selectedDate}T12:00`).toLocaleDateString(
                      "en-IN",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "rgba(200,208,232,0.7)",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "inherit",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.12)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#f0f4ff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "rgba(200,208,232,0.7)";
                    }}
                    data-ocid="calendar.detail.close_button"
                  >
                    ← Back
                  </button>
                </div>

                {isLastDayOfClasses && (
                  <div
                    style={{
                      color: "#a78bfa",
                      fontSize: 13,
                      marginBottom: 10,
                      padding: "8px 12px",
                      background: "rgba(139,92,246,0.1)",
                      borderRadius: 9,
                      border: "1px solid rgba(139,92,246,0.3)",
                    }}
                  >
                    🎓 Last Day of Classes
                  </div>
                )}

                {selHoliday && (
                  <div
                    style={{
                      color: "#F2C94C",
                      fontSize: 13,
                      marginBottom: 10,
                      padding: "8px 12px",
                      background: "rgba(242,201,76,0.08)",
                      borderRadius: 9,
                      border: "1px solid rgba(242,201,76,0.2)",
                    }}
                  >
                    🎉 Holiday: {selHoliday.name}
                  </div>
                )}

                {selExam && (
                  <div
                    style={{
                      color: "#FF7A59",
                      fontSize: 13,
                      marginBottom: 10,
                      padding: "8px 12px",
                      background: "rgba(255,122,89,0.08)",
                      borderRadius: 9,
                      border: "1px solid rgba(255,122,89,0.2)",
                    }}
                  >
                    📝{" "}
                    {selExam === "quiz1"
                      ? "Quiz 1"
                      : selExam === "quiz2"
                        ? "Quiz 2"
                        : "End Semester"}{" "}
                    Exam Period
                  </div>
                )}

                {showClasses && (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#3D4460",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                        marginBottom: 10,
                      }}
                    >
                      Classes
                    </div>
                    {selClasses.map((c) => (
                      <div
                        key={`${c.id}-${c.startTime}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 8,
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            width: 3,
                            height: 36,
                            borderRadius: 4,
                            background: c.color,
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div style={{ color: "#F0F4FF", fontWeight: 500 }}>
                            {c.name}
                          </div>
                          <div style={{ color: "#6B7590", fontSize: 11 }}>
                            {c.startTime}–{c.endTime}
                            {c.venue && (
                              <span style={{ color: "#505870" }}>
                                {" "}
                                &middot; {c.venue}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selTasks.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#3D4460",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      Tasks
                    </div>
                    {selTasks.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          fontSize: 13,
                          color: t.completed ? "#3D4460" : "#C8D0E8",
                          marginBottom: 4,
                          textDecoration: t.completed ? "line-through" : "none",
                        }}
                      >
                        &bull; {t.title}
                      </div>
                    ))}
                  </div>
                )}

                {!selHoliday &&
                  !selExam &&
                  !showClasses &&
                  selTasks.length === 0 && (
                    <div
                      data-ocid="calendar.empty_state"
                      style={{ color: "#3D4460", fontSize: 13 }}
                    >
                      {isAfterClassEnd
                        ? "No classes — semester ended."
                        : "Nothing scheduled."}
                    </div>
                  )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
