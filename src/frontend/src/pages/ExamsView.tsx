import { motion } from "motion/react";
import { useState } from "react";
import { GlassCard } from "../components/GlassCard";
import { useSemesterConfig } from "../hooks/useSemesterConfig";
import type { Course, ExamEntry, SemSettings } from "../types";
import { SLOT_EXAM_DATES, getSemCalendar } from "../utils/semester";

interface Props {
  courses: Course[];
  semSettings: SemSettings;
  examEntries: ExamEntry[];
  onSetExamOverride: (
    courseId: string,
    examType: "quiz1" | "quiz2" | "endSem",
    date: string,
  ) => void;
  onClearExamOverride: (
    courseId: string,
    examType: "quiz1" | "quiz2" | "endSem",
  ) => void;
}

function formatExactDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function countdownLabel(dateStr: string, today: string): string {
  if (dateStr < today) return "Done";
  if (dateStr === today) return "Today!";
  const days = Math.ceil(
    (new Date(`${dateStr}T12:00`).getTime() - new Date().getTime()) / 86400000,
  );
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function ExamsView({
  courses,
  semSettings,
  examEntries,
  onSetExamOverride,
  onClearExamOverride,
}: Props) {
  const { semConfig } = useSemesterConfig();
  const today = new Date().toISOString().split("T")[0];
  const [editingExam, setEditingExam] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");

  const cal = semConfig
    ? {
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
      }
    : getSemCalendar(semSettings.year, semSettings.semType);

  const dynamicSlotDates: Record<
    string,
    { quiz1: string; quiz2: string; endSem: string }
  > = semConfig
    ? Object.fromEntries(
        semConfig.slotExamDates.map((s) => [
          s.slot,
          { quiz1: s.quiz1, quiz2: s.quiz2, endSem: s.endSem },
        ]),
      )
    : SLOT_EXAM_DATES;

  const examTypes = [
    {
      key: "quiz1" as const,
      label: "Quiz 1",
      start: cal.quiz1Start,
      end: cal.quiz1End,
      color: "#6366f1",
    },
    {
      key: "quiz2" as const,
      label: "Quiz 2",
      start: cal.quiz2Start,
      end: cal.quiz2End,
      color: "#8b5cf6",
    },
    {
      key: "endSem" as const,
      label: "End Semester",
      start: cal.endSemStart,
      end: cal.endSemEnd,
      color: "#06b6d4",
    },
  ];

  const allExams = examTypes
    .flatMap((et) =>
      courses.map((c) => {
        const override = examEntries.find(
          (e) => e.courseId === c.id && e.examType === et.key,
        );
        const slotDates = dynamicSlotDates[c.slot];
        const exactDate = override
          ? override.date
          : slotDates
            ? slotDates[et.key]
            : et.start;
        const isCustom = !!override;
        return {
          ...et,
          course: c,
          exactDate,
          isCustom,
          isPast: exactDate < today,
          countdown: countdownLabel(exactDate, today),
        };
      }),
    )
    .sort((a, b) => a.exactDate.localeCompare(b.exactDate));

  const upcoming = allExams.filter((e) => !e.isPast);
  const past = allExams.filter((e) => e.isPast);

  const renderEditRow = (
    courseId: string,
    examType: "quiz1" | "quiz2" | "endSem",
    currentDate: string,
  ) => {
    const key = `${courseId}-${examType}`;
    if (editingExam !== key) return null;
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        style={{
          overflow: "hidden",
          padding: "8px 14px 8px 29px",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="date"
          className="glass-input"
          style={{ fontSize: 12, flex: "0 0 150px" }}
          value={editDate || currentDate}
          onChange={(e) => setEditDate(e.target.value)}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn-gradient"
          style={{ fontSize: 12, padding: "5px 14px" }}
          onClick={() => {
            onSetExamOverride(courseId, examType, editDate || currentDate);
            setEditingExam(null);
            setEditDate("");
          }}
        >
          Save
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="glass-btn"
          style={{ fontSize: 12, padding: "5px 14px", color: "#F2C94C" }}
          onClick={() => {
            onClearExamOverride(courseId, examType);
            setEditingExam(null);
            setEditDate("");
          }}
        >
          Reset
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="glass-btn"
          style={{ fontSize: 12, padding: "5px 14px" }}
          onClick={() => {
            setEditingExam(null);
            setEditDate("");
          }}
        >
          Cancel
        </motion.button>
      </motion.div>
    );
  };

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
          marginBottom: 8,
        }}
      >
        Exam Schedule
      </h2>
      <p style={{ color: "#A9B0C7", fontSize: 14, marginBottom: 24 }}>
        {semSettings.semType === "even" ? "Even" : "Odd"} Semester{" "}
        {semSettings.year} — slot-specific exam dates
      </p>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {examTypes.map((et) => (
          <GlassCard
            key={et.key}
            style={{
              borderColor: `${et.color}60`,
              boxShadow:
                "0 0 30px rgba(99,102,241,0.2), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#606880",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              {et.label}
            </div>
            <div style={{ fontSize: 14, color: et.color, fontWeight: 600 }}>
              {new Date(`${et.start}T12:00`).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}{" "}
              –{" "}
              {new Date(`${et.end}T12:00`).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}
            </div>
            <div style={{ fontSize: 12, color: "#A9B0C7", marginTop: 4 }}>
              {et.end < today ? "Completed" : "Window open"}
            </div>
          </GlassCard>
        ))}
      </div>

      {upcoming.length > 0 && (
        <GlassCard style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "#606880",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            Upcoming Exams
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map((e) => {
              const editKey = `${e.course.id}-${e.key}`;
              return (
                <div key={editKey}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 12,
                      border: `1px solid ${e.color}30`,
                      boxShadow: "0 0 24px rgba(99,102,241,0.1)",
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        height: 48,
                        borderRadius: 4,
                        background: e.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#F2F4FF",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {e.course.name}{" "}
                        <span style={{ color: e.color }}>— {e.label}</span>
                        {e.isCustom && (
                          <span
                            style={{
                              fontSize: 9,
                              background: `${e.color}22`,
                              border: `1px solid ${e.color}44`,
                              borderRadius: 4,
                              padding: "1px 5px",
                              color: e.color,
                              fontWeight: 700,
                            }}
                          >
                            Custom
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#D0D8FF",
                          fontWeight: 500,
                        }}
                      >
                        {formatExactDate(e.exactDate)}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.6)",
                          background: `${e.color}22`,
                          border: `1px solid ${e.color}44`,
                          borderRadius: 6,
                          padding: "2px 7px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Slot {e.course.slot}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: e.countdown === "Today!" ? "#06b6d4" : e.color,
                          fontWeight: 700,
                        }}
                      >
                        {e.countdown}
                      </span>
                      <motion.button
                        data-ocid="exams.edit_button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (editingExam === editKey) {
                            setEditingExam(null);
                          } else {
                            setEditingExam(editKey);
                            setEditDate(e.exactDate);
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 14,
                          opacity: 0.6,
                          padding: "0 2px",
                        }}
                        title="Edit date"
                      >
                        ✏️
                      </motion.button>
                    </div>
                  </motion.div>
                  {renderEditRow(e.course.id, e.key, e.exactDate)}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {upcoming.length === 0 && courses.length === 0 && (
        <GlassCard>
          <div
            data-ocid="exams.empty_state"
            style={{ color: "#4A5270", fontSize: 14, padding: "8px 0" }}
          >
            No courses registered. Add courses in the Timetable tab to see exam
            dates.
          </div>
        </GlassCard>
      )}

      {past.length > 0 && (
        <GlassCard>
          <div
            style={{
              fontSize: 11,
              color: "#606880",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            Completed Exams
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {past.map((e) => {
              const editKey = `${e.course.id}-${e.key}-done`;
              const editKeyInner = `${e.course.id}-${e.key}`;
              return (
                <div key={editKey}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      opacity: 0.6,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        height: 36,
                        borderRadius: 4,
                        background: e.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: "#A9B0C7" }}>
                        {e.course.name}{" "}
                        <span style={{ color: e.color }}>— {e.label}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#606880",
                          marginTop: 2,
                        }}
                      >
                        {formatExactDate(e.exactDate)}{" "}
                        <span
                          style={{
                            fontSize: 10,
                            background: `${e.color}20`,
                            border: `1px solid ${e.color}33`,
                            borderRadius: 4,
                            padding: "1px 6px",
                            marginLeft: 4,
                          }}
                        >
                          Slot {e.course.slot}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#06b6d4" }}>
                        ✓ Done
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (editingExam === editKeyInner) {
                            setEditingExam(null);
                          } else {
                            setEditingExam(editKeyInner);
                            setEditDate(e.exactDate);
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          opacity: 0.5,
                          padding: "0 2px",
                        }}
                        title="Edit date"
                      >
                        ✏️
                      </motion.button>
                    </div>
                  </div>
                  {renderEditRow(e.course.id, e.key, e.exactDate)}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}
