(() => {
"use strict";

const { parseForecast } = globalThis.WeatherWidget;

function createMockForecast(now = new Date()) {
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start = Date.parse(`${today}T12:00:00Z`);
  const dates = Array.from({ length: 7 }, (_, index) => (
    new Date(start + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  ));

  return parseForecast({
    current: { temperature_2m: 22, weather_code: 2, is_day: 1 },
    daily: {
      time: dates,
      weather_code: [61, 0, 2, 80, 3, 61, 0],
      temperature_2m_max: [22, 19, 19, 21, 20, 22, 21],
      temperature_2m_min: [19, 15, 14, 15, 13, 12, 15],
    },
  });
}

globalThis.WeatherWidget.createMockForecast = createMockForecast;
})();
