const CAMERAS: Record<string, string> = {
  "nyc_streets_cam-1": "Street corner 1",
  "nyc_streets_cam-2": "Street corner 2",
  "nyc_bike_gopro-1": "Bike camera",
  "sf_streets_cam-1": "Street camera 1",
  "sf_streets_cam-2": "Street camera 2",
  "sf_streets_cam-3": "Street camera 3",
  "sf_streets_cam-4": "Street camera 4",
  "sf_streets_cam-5": "Street camera 5",
};

export function cameraLabel(id: string) {
  return CAMERAS[id] ?? id;
}

export function cityLabel(id: string) {
  if (id === "san_francisco") return "San Francisco";
  if (id === "new_york") return "New York";
  return id;
}

export function vehicleLabel(type: string) {
  if (type === "suv") return "SUV";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatUpdated(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function displayWhen(timeLabel: string | undefined, caseDate: string) {
  if (timeLabel) return timeLabel;
  if (caseDate) return formatDate(caseDate);
  return "Any time";
}

export function whenLabel(date: string, start = "", end = "") {
  if (!date) return "Any time";
  const day = formatDate(date);
  if (!start || !end) return day;
  return `${day} · ${formatClock(start)}–${formatClock(end)}`;
}

function formatClock(hhmm: string) {
  const [hourValue, minute] = hhmm.split(":").map(Number);
  const suffix = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}
