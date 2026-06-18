export function currency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function monthLabel(dateString: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function firstDayOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function nextMonthStart(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
}

export function percentage(used: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}
