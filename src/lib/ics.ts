// .ics generation for meetings — per-meeting download, a subscribable
// all-meetings feed (served by /api/calendar.ics), and Google Calendar links.

import type { Meeting } from "./solid/turtle";

const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const icsDate = (iso: string) => {
  const d = new Date(iso);
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
};

const endOf = (m: Meeting) =>
  m.end ?? new Date(new Date(m.start).getTime() + 60 * 60 * 1000).toISOString();

function vevent(m: Meeting): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${m.id}@kai.emai.dev`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(m.start)}`,
    `DTEND:${icsDate(endOf(m))}`,
    `SUMMARY:${icsEscape(m.title)}`,
    ...(m.location ? [`LOCATION:${icsEscape(m.location)}`] : []),
    ...(m.description ? [`DESCRIPTION:${icsEscape(m.description)}`] : []),
    "END:VEVENT",
  ];
}

export function meetingToIcs(m: Meeting): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EmAI//Kai Project Hub//DE",
    ...vevent(m),
    "END:VCALENDAR",
  ].join("\r\n");
}

/** All meetings as one subscribable calendar (webcal feed). */
export function calendarIcs(meetings: Meeting[], name = "Kai — EmAI Project Hub"): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EmAI//Kai Project Hub//DE",
    `X-WR-CALNAME:${icsEscape(name)}`,
    "X-WR-TIMEZONE:Europe/Berlin",
    ...meetings.flatMap(vevent),
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Pre-filled "add to Google Calendar" template link. */
export function googleCalendarUrl(m: Meeting): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${icsDate(m.start)}/${icsDate(endOf(m))}`,
  });
  if (m.location) p.set("location", m.location);
  if (m.description) p.set("details", m.description);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function downloadIcs(m: Meeting): void {
  const blob = new Blob([meetingToIcs(m)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${m.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
