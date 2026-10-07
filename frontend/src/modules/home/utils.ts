const MORNING_START_HOUR = 5;
const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 17;
const NIGHT_START_HOUR = 21;

/** "Good morning" … "Good night" for a 0–23 local hour (the Fireflies Home headline). */
export function getGreeting(hour: number): string {
  if (hour >= NIGHT_START_HOUR || hour < MORNING_START_HOUR) return "Good night";
  if (hour >= EVENING_START_HOUR) return "Good evening";
  if (hour >= AFTERNOON_START_HOUR) return "Good afternoon";
  return "Good morning";
}
