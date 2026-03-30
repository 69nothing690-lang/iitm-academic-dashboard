export interface AttendanceRecord {
  id: string;
  courseId: string;
  date: string;
  status: "attended" | "absent" | "cancelled";
}

export function calcAttendance(records: AttendanceRecord[], courseId: string) {
  const courseRecords = records.filter(
    (r) => r.courseId === courseId && r.status !== "cancelled",
  );
  const attended = courseRecords.filter((r) => r.status === "attended").length;
  const total = courseRecords.length;
  const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);

  // To reach 75%: (attended + x) / (total + x) >= 0.75
  const toReach75 =
    percentage >= 75 ? 0 : Math.ceil((0.75 * total - attended) / 0.25);

  // Safe to skip: attended / (total + x) >= 0.75
  const safeSkip = percentage < 75 ? 0 : Math.floor(attended / 0.75 - total);

  return { attended, total, percentage, toReach75, safeSkip };
}
