const counts = {};
const errors = {};
const startTime = Date.now();

export function track(api) {
  const day = new Date().toISOString().slice(0, 10);
  counts[api] ??= {};
  counts[api][day] = (counts[api][day] ?? 0) + 1;
}

export function trackError(api) {
  const day = new Date().toISOString().slice(0, 10);
  errors[api] ??= {};
  errors[api][day] = (errors[api][day] ?? 0) + 1;
}

export function getStats() {
  const today = new Date().toISOString().slice(0, 10);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const summary = {};
  for (const api of Object.keys(counts)) {
    summary[api] = {
      today: counts[api][today] ?? 0,
      total: Object.values(counts[api]).reduce((a, b) => a + b, 0),
      last7: last7.map(d => ({ date: d, count: counts[api][d] ?? 0 })),
      errors: errors[api]?.[today] ?? 0,
    };
  }
  return { apis: summary, uptimeMs: Date.now() - startTime };
}
