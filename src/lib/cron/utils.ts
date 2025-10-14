// Lightweight 5-field cron handling (m h dom mon dow) with support for:
// - wildcards '*'
// - lists '1,2,3'
// - ranges '1-5'
// - steps '*/5' or '1-10/2'
// Note: dow uses 0-6 (Sun=0). 7 is normalized to 0.

export function normalizeCron(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  // Remove code fences/backticks and inline code formatting
  s = s.replace(/^```[a-zA-Z]*\n?|```$/g, '');
  s = s.replace(/`/g, '');
  // Replace non-breaking spaces and multiple whitespace with single space
  s = s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  // Strip leading/trailing quotes
  s = s.replace(/^['"]+|['"]+$/g, '');
  // If 6+ fields (with seconds), drop leading seconds to 5 fields
  const parts = s.split(' ').filter(Boolean);
  if (parts.length >= 6) {
    s = parts.slice(parts.length - 5).join(' ');
  } else if (parts.length < 5) {
    return null;
  }
  return s;
}

export function isValidCron(cron: string | null | undefined): boolean {
  return nextRunIso(cron) !== null;
}

export function nextRunIso(cron: string | null | undefined): string | null {
  const c = normalizeCron(cron);
  if (!c) return null;
  const parts = c.split(' ');
  if (parts.length !== 5) return null;

  const [mExpr, hExpr, domExpr, monExpr, dowExpr] = parts;
  const minuteOk = buildMatcher(mExpr, 0, 59);
  const hourOk = buildMatcher(hExpr, 0, 23);
  const domOk = buildMatcher(domExpr, 1, 31);
  const monOk = buildMatcher(monExpr, 1, 12);
  const dowOk = buildMatcher(normalizeDowExpr(dowExpr), 0, 6);

  // Start from next minute (exclusive of now) in UTC
  const start = new Date();
  const t = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
    start.getUTCHours(),
    start.getUTCMinutes(),
    0,
    0
  ));
  t.setUTCMinutes(t.getUTCMinutes() + 1);

  // Search up to 366 days ahead
  const maxIterations = 366 * 24 * 60;
  for (let i = 0; i < maxIterations; i++) {
    const minute = t.getUTCMinutes();
    const hour = t.getUTCHours();
    const dom = t.getUTCDate();
    const mon = t.getUTCMonth() + 1;
    let dow = t.getUTCDay(); // 0-6, Sun=0

    if (
      minuteOk(minute) &&
      hourOk(hour) &&
      monOk(mon) &&
      // Cron DOM/DOW OR semantics: if either field is wildcard, the other must match; if both specified, either can match (per standard behavior)
      domDowMatch(domOk, domExpr, dom, dowOk, dowExpr, dow)
    ) {
      return t.toISOString();
    }

    // increment by one minute
    t.setUTCMinutes(t.getUTCMinutes() + 1);
  }
  return null;
}

function normalizeDowExpr(expr: string): string {
  // Replace any 7 with 0 for Sunday
  if (expr === '*') return expr;
  return expr
    .split(',')
    .map(part => {
      const p = part.trim();
      if (p.includes('-')) {
        const [a, bStep] = p.split('-');
        const [b, step] = bStep.split('/');
        const aNum = mapDow(Number(a));
        const bNum = mapDow(Number(b));
        return step ? `${aNum}-${bNum}/${step}` : `${aNum}-${bNum}`;
      }
      const [val, step] = p.split('/');
      const vNum = val === '*' ? '*' : String(mapDow(Number(val)));
      return step ? `${vNum}/${step}` : vNum;
    })
    .join(',');
}

function mapDow(v: number): number {
  if (v === 7) return 0;
  return v;
}

function domDowMatch(
  domOk: (v: number) => boolean,
  domExpr: string,
  dom: number,
  dowOk: (v: number) => boolean,
  dowExpr: string,
  dow: number
): boolean {
  const domAny = domExpr === '*';
  const dowAny = dowExpr === '*';
  if (domAny && dowAny) return true;
  if (domAny) return dowOk(dow);
  if (dowAny) return domOk(dom);
  return domOk(dom) || dowOk(dow);
}

function buildMatcher(expr: string, min: number, max: number): (v: number) => boolean {
  if (expr === '*') return () => true;
  const allowed = new Set<number>();
  for (const token of expr.split(',')) {
    const t = token.trim();
    if (!t) continue;
    // Handle steps
    const [rangePart, stepPart] = t.split('/');
    const step = stepPart ? Math.max(1, Number(stepPart)) : 1;

    if (rangePart === '*') {
      for (let v = min; v <= max; v += step) allowed.add(v);
      continue;
    }

    if (rangePart.includes('-')) {
      const [aStr, bStr] = rangePart.split('-');
      let a = Number(aStr);
      let b = Number(bStr);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (a > b) [a, b] = [b, a];
      a = clamp(a, min, max);
      b = clamp(b, min, max);
      for (let v = a; v <= b; v += step) allowed.add(v);
      continue;
    }

    // Single value
    const v = clamp(Number(rangePart), min, max);
    if (Number.isFinite(v)) {
      // respect step even for single values only if divisible from min
      if ((v - min) % step === 0) allowed.add(v);
    }
  }
  return (v: number) => allowed.has(clamp(v, min, max));
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return v;
  return Math.max(min, Math.min(max, v));
}


