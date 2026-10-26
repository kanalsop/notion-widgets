import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { fetchFukuokaForecast, forecastDayLabel, parseForecast, weatherForCode } from "./weather.mjs";

const directory = dirname(fileURLToPath(import.meta.url));

test("weather codes map to English conditions and existing local SVG icons", () => {
  const conditions = [
    [0, "Clear sky", "./icons/wi-day-sunny.svg"],
    [2, "Partly cloudy", "./icons/wi-day-sunny-overcast.svg"],
    [61, "Slight rain", "./icons/wi-rain.svg"],
    [95, "Thunderstorm", "./icons/wi-thunderstorm.svg"],
  ];
  const weatherCodes = [
    0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73,
    75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
  ];

  for (const [code, label, icon] of conditions) {
    assert.deepEqual(weatherForCode(code), { label, icon });
  }
  for (const code of weatherCodes) {
    assert.ok(existsSync(resolve(directory, weatherForCode(code).icon.slice(2))));
  }
  assert.equal(weatherForCode(0, 0).icon, "./icons/wi-night-clear.svg");
  assert.equal(weatherForCode(2, 0).icon, "./icons/wi-night-alt-cloudy.svg");
  assert.ok(existsSync(resolve(directory, "icons/wi-night-clear.svg")));
  assert.ok(existsSync(resolve(directory, "icons/wi-night-alt-cloudy.svg")));
  assert.deepEqual(weatherForCode(999), { label: "Unavailable", icon: "./icons/wi-na.svg" });
});

test("forecast data includes current conditions and each available daily forecast", () => {
  const result = parseForecast({
    current: { temperature_2m: 18.6, weather_code: 2, time: "2026-10-27T10:00" },
    daily: {
      time: ["2026-10-27", "2026-10-28"],
      weather_code: [2, 61],
      temperature_2m_max: [21.4, 17.2],
      temperature_2m_min: [14.1, 11.9],
    },
  });

  assert.equal(result.current.temperature, 19);
  assert.equal(result.current.label, "Partly cloudy");
  assert.deepEqual(result.days, [
    { date: "2026-10-27", code: 2, high: 21, low: 14 },
    { date: "2026-10-28", code: 61, high: 17, low: 12 },
  ]);
});

test("forecast labels start with Today and continue in local weekday order", () => {
  assert.equal(forecastDayLabel("2026-10-27", 0), "Today");
  assert.equal(forecastDayLabel("2026-10-28", 1), "Wednesday");
  assert.equal(forecastDayLabel("2026-11-02", 6), "Monday");
});

test("malformed daily values are rejected instead of showing invalid temperatures", () => {
  assert.throws(() => parseForecast({
    current: { temperature_2m: 18, weather_code: 0 },
    daily: {
      time: ["2026-10-27"],
      weather_code: [0],
      temperature_2m_max: [null],
      temperature_2m_min: [14],
    },
  }), /invalid format/);
});

test("forecast request uses Fukuoka coordinates and local time without an API key", async () => {
  let requestedUrl;
  const result = await fetchFukuokaForecast(async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        current: { temperature_2m: 20, weather_code: 0, time: "2026-10-27T10:00" },
        daily: {
          time: ["2026-10-27"],
          weather_code: [0],
          temperature_2m_max: [22],
          temperature_2m_min: [16],
        },
      }),
    };
  });

  assert.equal(requestedUrl.searchParams.get("latitude"), "33.5904");
  assert.equal(requestedUrl.searchParams.get("longitude"), "130.4017");
  assert.equal(requestedUrl.searchParams.get("timezone"), "Asia/Tokyo");
  assert.equal(requestedUrl.searchParams.get("forecast_days"), "7");
  assert.equal(requestedUrl.searchParams.get("current"), "temperature_2m,weather_code,is_day");
  assert.equal(requestedUrl.searchParams.has("apikey"), false);
  assert.equal(result.current.temperature, 20);
});

test("failed API responses surface an error for the widget to display", async () => {
  await assert.rejects(
    fetchFukuokaForecast(async () => ({ ok: false, status: 503 })),
    /503/,
  );
});

test("weather page uses English labels and a horizontal forecast without dates", () => {
  const html = readFileSync(resolve(directory, "index.html"), "utf8");
  const css = readFileSync(resolve(directory, "style.css"), "utf8");
  assert.doesNotMatch(html, /This Week|day-condition/);
  assert.match(html, /class="weather-row"/);
  assert.match(html, /rel="stylesheet" href="\.\/style\.css"/);
  assert.match(css, /\.current\s*{[^}]*text-align:\s*center/s);
  assert.match(css, /\.day\s*{[^}]*text-align:\s*center/s);
  assert.match(css, /\.attribution\s*{[^}]*text-align:\s*right/s);
  assert.doesNotMatch(html, /day-date|month:|day:/);
});
