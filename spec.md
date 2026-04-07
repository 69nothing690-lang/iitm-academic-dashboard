# InstiFlow — Logic & Behavior Fixes (v69)

## Current State
- Timetable uses `Course[]` where each course has one `slot` field; all cells for that slot share the same course ID, so removing one cell removes the course from every day
- Evening slots (6–8 PM) are stored in a separate `instiflow_evening_slots` localStorage key and are NOT counted in dashboard stats, calendar, or notifications
- Each timetable slot cell accepts only one course (no stacking)
- Notifications: no test button; no class-reminder timing selector; no exam/task timing selectors
- Hero LandingPage: text animation delays use `stagger(i)` which produces delays up to ~0.4s; Spline loads via a dynamic script tag that only resolves when the remote server responds
- Performance: minor re-render opportunities

## Requested Changes (Diff)

### Add
- `TimetableEntry` type: `{ id, courseId, courseName, courseCode, slot, day, colIndex, startTime, endTime, venue, color }` — each cell in the grid is a unique entry
- `addTimetableEntry(entry)` / `deleteTimetableEntry(id)` mutations in `useAppData`
- `timetableEntries` state persisted to localStorage + Firestore
- Extra slot (`EXTRA_6_8`) as a proper slot column in the main grid, treated identically to A–T slots in stats, notifications, calendar
- In-app foreground notification popup (glass UI) component
- Settings page: "🔔 Test Notification" button
- Settings page: class reminder timing selector (5 / 10 / 15 / 30 min)
- Settings page: daily summary time picker (already exists — verify it's wired)
- Settings page: task reminder timing selector
- Settings page: exam reminder timing selector
- `showNotification(title, body)` util function

### Modify
- `Timetable.tsx`: grid cells render from `timetableEntries` filtered by day+col; stacks multiple entries vertically; remove button calls `deleteTimetableEntry(entry.id)` not `deleteCourse(course.id)`
- `Timetable.tsx`: "Add Course" form adds a `TimetableEntry` for each slot occurrence of the selected slot (one entry per day × col occurrence), each with a unique ID
- `Timetable.tsx`: Evening slot form adds entries with `slot = "EXTRA_6_8"` and renders inside the main grid as an extra column
- `slots.ts`: add `EXTRA_6_8` to `SLOT_OCCURRENCES` for the days selected by user (dynamic, driven by entries)
- `NotificationManager.tsx`: use `reminderMinutes` pref for class reminder timing; respect `examRemindersEnabled` / `taskRemindersEnabled` toggles; add foreground popup UI
- `SettingsView.tsx`: add test notification button, reminder timing selectors
- `LandingPage.tsx`: reduce animation delays; show text immediately without waiting for Spline; preload Spline script eagerly
- `storage.ts`: bump APP_VERSION to "69"
- `useAppData.ts`: add `timetableEntries`, `addTimetableEntry`, `deleteTimetableEntry`; include in Firestore sync
- `TodayDashboard.tsx`: count courses from `timetableEntries` (unique courseIds) for stats

### Remove
- Separate `instiflow_evening_slots` localStorage key (migrate to `timetableEntries` with `slot = "EXTRA_6_8"`)
- The existing `onDeleteCourse` cell-click that wiped the whole course from every slot

## Implementation Plan
1. Update `types.ts` — add `TimetableEntry` interface
2. Update `storage.ts` — bump version to "69"
3. Update `useAppData.ts` — add `timetableEntries` state + mutations + Firestore sync
4. Update `slots.ts` — add `EXTRA_6_8` color/label helpers
5. Rewrite `Timetable.tsx` — new grid rendering from entries, extra column, stacking, entry-level delete
6. Update `NotificationManager.tsx` — use reminder prefs, add foreground popup
7. Update `SettingsView.tsx` — test button, timing selectors
8. Update `LandingPage.tsx` — faster animation delays, eager Spline load
9. Update `TodayDashboard.tsx` — use unique courseIds from timetableEntries for course count
