export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export function getHolidaysForSem(
  year: number,
  semType: "even" | "odd",
): Holiday[] {
  if (semType === "even") {
    // Even Sem 2026 (Jan–May) — IITM Academic Calendar (accurate dates)
    return [
      { date: `${year}-01-14`, name: "Pongal" },
      { date: `${year}-01-15`, name: "Pongal (2nd day)" },
      { date: `${year}-01-16`, name: "Thiruvalluvar Day" },
      { date: `${year}-01-26`, name: "Republic Day" },
      { date: `${year}-01-29`, name: "Saarang" },
      { date: `${year}-01-30`, name: "Saarang" },
      { date: `${year}-01-31`, name: "Saarang" },
      { date: `${year}-02-02`, name: "Saarang (last day)" },
      { date: `${year}-03-20`, name: "Idu'l Fitr (Eid al-Fitr)" },
      { date: `${year}-04-03`, name: "Good Friday" },
      { date: `${year}-04-14`, name: "Tamil New Year / Dr. Ambedkar Jayanti" },
      { date: `${year}-05-23`, name: "Buddha Purnima" },
    ];
  }
  // Odd Semester (Jul–Nov)
  return [
    { date: `${year}-08-15`, name: "Independence Day" },
    { date: `${year}-10-02`, name: "Gandhi Jayanti" },
    { date: `${year}-10-24`, name: "Dussehra" },
    { date: `${year}-11-01`, name: "Diwali" },
  ];
}

export function isHoliday(
  date: string,
  holidays: Holiday[],
): Holiday | undefined {
  return holidays.find((h) => h.date === date);
}
