// 수거·배송 일정 규칙. 서버가 어느 시간대에 있든 서울 시간으로 계산한다.
//
// - 수거: 월~목 19~22시. 18시 전에 입금이 확인되면 그날, 아니면 다음 수거일.
// - 배송: 월~토 19~22시.

export const PICKUP_DAYS = [1, 2, 3, 4]; // 월~목
export const DELIVERY_DAYS = [1, 2, 3, 4, 5, 6]; // 월~토
export const SAME_DAY_CUTOFF_HOUR = 18;
export const VISIT_WINDOW = "19~22시";

/** YYYY-MM-DD */
export type DateStr = string;

interface SeoulNow {
  date: DateStr;
  hour: number;
  minute: number;
}

export function seoulNow(now: Date = new Date()): SeoulNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour, minute: Number(get("minute")) };
}

export function seoulToday(now: Date = new Date()): DateStr {
  return seoulNow(now).date;
}

/** 날짜 문자열의 요일 (0=일) */
export function weekday(date: DateStr): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: DateStr, n: number): DateStr {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function nextOpenDay(from: DateStr, days: number[], closed: Set<DateStr>, includeFrom: boolean): DateStr {
  let d = includeFrom ? from : addDays(from, 1);
  for (let i = 0; i < 60; i++) {
    if (days.includes(weekday(d)) && !closed.has(d)) return d;
    d = addDays(d, 1);
  }
  throw new Error("60일 안에 운영일이 없어요. 휴무일 설정을 확인하세요.");
}

/**
 * 입금이 확인된 시각(또는 지금)을 기준으로 수거일을 정한다.
 * 수거일이 오늘이고 18시 전이면 오늘, 그 밖에는 다음 수거일.
 */
export function pickupDateFor(confirmedAt: Date = new Date(), closedDates: DateStr[] = []): DateStr {
  const now = seoulNow(confirmedAt);
  const closed = new Set(closedDates);
  const sameDay = now.hour < SAME_DAY_CUTOFF_HOUR;
  return nextOpenDay(now.date, PICKUP_DAYS, closed, sameDay);
}

export function isPickupDay(date: DateStr, closedDates: DateStr[] = []): boolean {
  return PICKUP_DAYS.includes(weekday(date)) && !closedDates.includes(date);
}

export function isDeliveryDay(date: DateStr, closedDates: DateStr[] = []): boolean {
  return DELIVERY_DAYS.includes(weekday(date)) && !closedDates.includes(date);
}

/** 오늘 이후 가장 빠른 배송 가능일 (오늘 포함) */
export function nextDeliveryDate(now: Date = new Date(), closedDates: DateStr[] = []): DateStr {
  return nextOpenDay(seoulToday(now), DELIVERY_DAYS, new Set(closedDates), true);
}

const WEEK = "일월화수목금토";

/** 11/24(월) */
export function formatDay(date: DateStr): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}(${WEEK[weekday(date)]})`;
}
