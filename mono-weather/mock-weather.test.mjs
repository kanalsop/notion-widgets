import test from "node:test";
import assert from "node:assert/strict";
import { createMockForecast } from "./mock-weather.mjs";

test("mock provides seven days starting on today's date in Japan without network access", () => {
  const data = createMockForecast(new Date("2026-10-27T16:00:00Z"));
  assert.equal(data.current.temperature, 22);
  assert.equal(data.current.label, "Partly cloudy");
  assert.equal(data.days.length, 7);
  assert.equal(data.days[0].date, "2026-10-28");
  assert.equal(data.days[6].date, "2026-11-03");
  assert.ok(new Set(data.days.map((day) => day.code)).size > 1);
});
