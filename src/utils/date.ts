export const START_DATE = "2026-06-01";
export const END_DATE = "2026-08-01";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "primary" | "admin";
}

export const Jr: Record<string, UserProfile> = {
  dhiraj: {
    id: "dhiraj",
    email: "badshedheeraj@gmail.com",
    displayName: "Dhiraj",
    role: "primary",
  },
  aastha: {
    id: "aastha",
    email: "maastha83@gmail.com",
    displayName: "Aastha",
    role: "admin",
  },
};

export const USERS = Jr;

// Parse YYYY-MM-DD to a UTC Date object
export function ay(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
export const parseUTCDate = ay;

// Format Date object to YYYY-MM-DD UTC string
export function formatUTCDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export const formatUTCDate = formatUTCDateString;

// Calculate days between two YYYY-MM-DD dates
export function daysBetween(startStr: string, endStr: string): number {
  return Math.round((parseUTCDate(endStr).getTime() - parseUTCDate(startStr).getTime()) / 86400000);
}

// Get today's date in Kolkata timezone as YYYY-MM-DD
export function s9(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}
export const getKolkataToday = s9;

// Check if date2 is after or equal to date1
export function st(date1: string, date2: string): boolean {
  return daysBetween(date1, date2) >= 0;
}
export const isAfterOrEqual = st;

// Calculate journey stats based on a current date
export function wm(currentDateStr: string = s9()) {
  const totalDays = Math.max(1, daysBetween(START_DATE, END_DATE));
  const elapsed = Math.min(Math.max(daysBetween(START_DATE, currentDateStr) + 1, 0), totalDays + 1);
  const daysUntilHome = Math.max(0, daysBetween(currentDateStr, END_DATE));
  const daysUntilInternshipEnds = Math.max(0, daysBetween(currentDateStr, "2026-07-31"));
  const percentComplete = Math.min(100, Math.max(0, Math.round((elapsed / (totalDays + 1)) * 100)));

  return {
    totalDays,
    elapsed,
    daysUntilHome,
    daysUntilInternshipEnds,
    percentComplete,
    finalWeek: daysUntilHome > 0 && daysUntilHome <= 7,
    finale: daysBetween(END_DATE, currentDateStr) >= 0,
  };
}
export const getJourneyStats = wm;

// Generate all YYYY-MM-DD date strings for the entire timeline
export function o0(): string[] {
  const len = daysBetween(START_DATE, END_DATE) + 1;
  return Array.from({ length: len }, (_, i) => {
    const time = parseUTCDate(START_DATE).getTime() + 86400000 * i;
    return formatUTCDateString(new Date(time));
  });
}
export const generateTimelineDays = o0;

// Generate the padded calendar grid array for a given year and month index (0-11)
export function bl(year: number, monthIndex: number): (string | null)[] {
  const startDayOfWeek = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const adjustedStartDay = (startDayOfWeek + 6) % 7;
  const numDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return [
    ...Array.from({ length: adjustedStartDay }, () => null),
    ...Array.from({ length: numDays }, (_, i) =>
      formatUTCDateString(new Date(Date.UTC(year, monthIndex, i + 1)))
    ),
  ];
}
export const generateCalendarGrid = bl;

// Format YYYY-MM-DD into "Jun 16, 2026" friendly format
export function YQ(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseUTCDate(dateStr));
}
export const formatDateFriendly = YQ;

// Format YYYY-MM-DDTHH:mm into "Jun 16, 2026 at 6:30 PM" friendly format
export function formatDateTimeFriendly(dateStr: string): string {
  let fullDateStr = dateStr;
  if (!fullDateStr.includes("T")) {
    fullDateStr += "T00:00";
  }
  const date = new Date(fullDateStr);
  if (isNaN(date.getTime())) return formatDateFriendly(dateStr);
  
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
