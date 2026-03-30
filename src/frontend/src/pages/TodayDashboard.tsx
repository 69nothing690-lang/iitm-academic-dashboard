import { motion } from "motion/react";
import { GlassCard } from "../components/GlassCard";
import { ProgressBar } from "../components/ProgressBar";
import { useTabTheme } from "../contexts/TabTheme";
import { useCountUp } from "../hooks/useCountUp";
import type { AttendanceRecord, Course, SemSettings, Task } from "../types";
import { calcAttendance } from "../utils/attendance";
import { getHolidaysForSem, isHoliday } from "../utils/holidays";
import { getSemCalendar, isExamPeriod } from "../utils/semester";
import { getClassesOnDay } from "../utils/slots";

function StatCard({
  stat,
  delay,
}: {
  stat: { label: string; value: number; icon: string; color: string };
  delay: number;
}) {
  const displayValue = useCountUp(stat.value, 700, delay * 1000);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <GlassCard hover>
        <div style={{ fontSize: 22, marginBottom: 8 }}>{stat.icon}</div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: stat.color,
            letterSpacing: "-0.5px",
            textShadow: `0 0 20px ${stat.color}80, 0 0 40px ${stat.color}40`,
          }}
        >
          {displayValue}
        </div>
        <div style={{ fontSize: 12, color: "#6B7590", marginTop: 2 }}>
          {stat.label}
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface Props {
  courses: Course[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  semSettings: SemSettings;
  studentName: string;
  onTabChange: (t: string) => void;
}

export function TodayDashboard({
  courses,
  attendance,
  tasks,
  semSettings,
  studentName,
  onTabChange,
}: Props) {
  const { accent } = useTabTheme();
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayStr = now.toISOString().split("T")[0];
  const dayOfWeek = now.getDay();

  const cal = getSemCalendar(semSettings.year, semSettings.semType);
  const holidays = getHolidaysForSem(semSettings.year, semSettings.semType);
  const todayHoliday = isHoliday(todayStr, holidays);
  const examPeriod = isExamPeriod(todayStr, cal);

  const todaysClasses = todayHoliday ? [] : getClassesOnDay(dayOfWeek, courses);

  const upcomingTasks = tasks
    .filter((t) => !t.completed && t.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const alertCourses = courses.filter((c) => {
    const { percentage, total } = calcAttendance(attendance, c.id);
    return percentage < 75 && total > 0;
  });

  const semLabel =
    semSettings.semType === "even" ? "Even Semester" : "Odd Semester";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: "32px 28px", maxWidth: 920 }}
    >
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.6px",
            background:
              "linear-gradient(135deg, #fff 30%, #a78bfa 60%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {greeting}, {studentName}! 👋
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{ color: "#6B7590", marginTop: 6, fontSize: 14 }}
        >
          {now.toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          &middot; {semLabel} {semSettings.year}
          {examPeriod && (
            <span
              style={{
                color: "rgba(255,122,89,0.85)",
                marginLeft: 12,
                fontWeight: 700,
                background: "rgba(255,122,89,0.1)",
                padding: "2px 8px",
                borderRadius: 6,
                border: "1px solid rgba(255,122,89,0.25)",
              }}
            >
              ⚠{" "}
              {examPeriod === "quiz1"
                ? "Quiz 1"
                : examPeriod === "quiz2"
                  ? "Quiz 2"
                  : "End Semester"}{" "}
              Exam Period
            </span>
          )}
        </motion.p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          {
            label: "Courses",
            value: courses.length,
            icon: "📚",
            color: "#a78bfa",
          },
          {
            label: "Today's Classes",
            value: todaysClasses.length,
            icon: "🎓",
            color: "#06b6d4",
          },
          {
            label: "Pending Tasks",
            value: tasks.filter((t) => !t.completed).length,
            icon: "✅",
            color: "#818cf8",
          },
          {
            label: "Below 75%",
            value: alertCourses.length,
            icon: "⚠️",
            color: "rgba(255,122,89,0.85)",
          },
        ].map((stat, i) => (
          <StatCard key={stat.label} stat={stat} delay={0.08 + i * 0.08} />
        ))}
      </div>

      {/* Classes + Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.4 }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <GlassCard>
          <div
            style={{
              fontSize: 10,
              color: "#3D4460",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            Today&apos;s Classes
          </div>
          {todayHoliday ? (
            <div
              style={{
                color: "#818cf8",
                fontSize: 14,
                padding: "6px 10px",
                background: "rgba(242,201,76,0.08)",
                borderRadius: 8,
              }}
            >
              🎉 Holiday: {todayHoliday.name}
            </div>
          ) : dayOfWeek === 0 ? (
            <div style={{ color: "#3D4460", fontSize: 14 }}>
              No classes on Sunday
            </div>
          ) : todaysClasses.length === 0 ? (
            <div style={{ color: "#3D4460", fontSize: 14 }}>
              No classes today
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {todaysClasses.map((c) => (
                <motion.div
                  key={c.id + c.startTime}
                  whileHover={{ x: 4 }}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 3,
                      height: 38,
                      borderRadius: 4,
                      background: c.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${c.color}80`,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#F0F4FF",
                      }}
                    >
                      {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7590" }}>
                      {c.startTime}–{c.endTime} &middot; Slot {c.slot}
                      {c.venue && (
                        <span style={{ color: "#505870" }}>
                          {" "}
                          &middot; {c.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#3D4460",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Upcoming Tasks
            </div>
            <button
              type="button"
              data-ocid="today.tasks.link"
              onClick={() => onTabChange("tasks")}
              style={{
                fontSize: 11,
                color: accent,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              View all →
            </button>
          </div>
          {upcomingTasks.length === 0 ? (
            <div style={{ color: "#3D4460", fontSize: 14 }}>
              No pending tasks 🎉
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {upcomingTasks.map((t) => (
                <motion.div
                  key={t.id}
                  whileHover={{ x: 4 }}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accent,
                      marginTop: 5,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${accent}80`,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, color: "#F0F4FF" }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7590" }}>
                      {new Date(`${t.date}T12:00`).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                      {t.time ? ` · ${t.time}` : ""}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Attendance Alerts */}
      {alertCourses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44, duration: 0.4 }}
        >
          <GlassCard
            style={{ borderColor: "rgba(255,122,89,0.25)", marginBottom: 16 }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,122,89,0.85)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              ⚠ Attendance Alerts
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 8,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {alertCourses.map((c) => {
                const stats = calcAttendance(attendance, c.id);
                return (
                  <div
                    key={c.id}
                    style={{
                      padding: "10px 12px",
                      background: "rgba(255,122,89,0.06)",
                      borderRadius: 10,
                      border: "1px solid rgba(255,122,89,0.18)",
                      minWidth: 180,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#F0F4FF",
                        marginBottom: 4,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,122,89,0.85)",
                        marginBottom: 6,
                      }}
                    >
                      {stats.percentage}% attendance
                    </div>
                    <ProgressBar percentage={stats.percentage} />
                    <div
                      style={{ fontSize: 11, color: "#6B7590", marginTop: 6 }}
                    >
                      Need {stats.toReach75} more classes
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
}
