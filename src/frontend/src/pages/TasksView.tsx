import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { GlassCard } from "../components/GlassCard";
import type { Task } from "../types";

interface Props {
  tasks: Task[];
  onAddTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
}

export function TasksView({
  tasks,
  onAddTask,
  onDeleteTask,
  onToggleTask,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");
  const today = new Date().toISOString().split("T")[0];

  const handleAdd = () => {
    if (!title.trim()) return;
    onAddTask({
      id: Date.now().toString(),
      title: title.trim(),
      date,
      time: time || undefined,
      notes: notes || undefined,
      completed: false,
    });
    setTitle("");
    setTime("");
    setNotes("");
  };

  const filtered = tasks
    .filter((t) =>
      filter === "all"
        ? true
        : filter === "completed"
          ? t.completed
          : !t.completed && t.date >= today,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: "32px 28px", maxWidth: 700 }}
    >
      <h2
        className="page-heading-gradient"
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        Tasks
      </h2>
      <GlassCard style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            color: "#606880",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Add Task
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            data-ocid="tasks.input"
            className="glass-input"
            placeholder="Task title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="glass-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="glass-input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ flex: 1 }}
              placeholder="Time (optional)"
            />
          </div>
          <input
            className="glass-input"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <motion.button
            data-ocid="tasks.submit_button"
            whileTap={{ scale: 0.97 }}
            className="btn-gradient"
            style={{ padding: "10px 20px", fontSize: 14 }}
            onClick={handleAdd}
          >
            Add Task
          </motion.button>
        </div>
      </GlassCard>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "upcoming", "completed"] as const).map((f) => (
          <motion.button
            key={f}
            data-ocid={`tasks.${f}.tab`}
            whileTap={{ scale: 0.97 }}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border:
                filter === f
                  ? "1px solid rgba(99,102,241,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
              background:
                filter === f ? "rgba(99,102,241,0.15)" : "transparent",
              color: filter === f ? "#a78bfa" : "#A9B0C7",
              fontSize: 13,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <GlassCard key="empty">
            <div style={{ color: "#A9B0C7", fontSize: 14 }}>No tasks here.</div>
          </GlassCard>
        ) : (
          filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ marginBottom: 8 }}
            >
              <GlassCard
                style={{
                  opacity: t.completed ? 0.6 : 1,
                  transition: "box-shadow 0.2s",
                }}
                className="task-card-hover"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <motion.button
                    data-ocid="tasks.checkbox"
                    whileTap={{ scale: 0.8 }}
                    onClick={() => onToggleTask(t.id)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${
                        t.completed ? "#8b5cf6" : "rgba(255,255,255,0.2)"
                      }`,
                      background: t.completed ? "#8b5cf6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginTop: 2,
                      color: "#0A0F24",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {t.completed && "✓"}
                  </motion.button>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#F2F4FF",
                        textDecoration: t.completed ? "line-through" : "none",
                        fontWeight: 500,
                      }}
                    >
                      {t.title}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#A9B0C7", marginTop: 2 }}
                    >
                      {new Date(`${t.date}T12:00`).toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {t.time ? ` · ${t.time}` : ""}
                    </div>
                    {t.notes && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#606880",
                          marginTop: 4,
                        }}
                      >
                        {t.notes}
                      </div>
                    )}
                  </div>
                  <motion.button
                    data-ocid="tasks.delete_button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDeleteTask(t.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#FF7A59",
                      cursor: "pointer",
                      fontSize: 18,
                      opacity: 0.6,
                    }}
                  >
                    ×
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </motion.div>
  );
}
