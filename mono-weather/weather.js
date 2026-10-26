(() => {
"use strict";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const CONDITIONS = new Map([
  [0, { label: "Clear sky", icon: "./icons/wi-day-sunny.svg" }],
  [1, { label: "Mainly clear", icon: "./icons/wi-day-sunny.svg" }],
  [2, { label: "Partly cloudy", icon: "./icons/wi-day-sunny-overcast.svg" }],
  [3, { label: "Overcast", icon: "./icons/wi-cloudy.svg" }],
  [45, { label: "Fog", icon: "./icons/wi-fog.svg" }],
  [48, { label: "Depositing rime fog", icon: "./icons/wi-fog.svg" }],
  [51, { label: "Light drizzle", icon: "./icons/wi-sprinkle.svg" }],
  [53, { label: "Drizzle", icon: "./icons/wi-sprinkle.svg" }],
  [55, { label: "Dense drizzle", icon: "./icons/wi-rain.svg" }],
  [56, { label: "Light freezing drizzle", icon: "./icons/wi-sleet.svg" }],
  [57, { label: "Freezing drizzle", icon: "./icons/wi-sleet.svg" }],
  [61, { label: "Slight rain", icon: "./icons/wi-rain.svg" }],
  [63, { label: "Rain", icon: "./icons/wi-rain.svg" }],
  [65, { label: "Heavy rain", icon: "./icons/wi-rain.svg" }],
  [66, { label: "Light freezing rain", icon: "./icons/wi-rain-mix.svg" }],
  [67, { label: "Freezing rain", icon: "./icons/wi-rain-mix.svg" }],
  [71, { label: "Slight snow", icon: "./icons/wi-snow.svg" }],
  [73, { label: "Snow", icon: "./icons/wi-snow.svg" }],
  [75, { label: "Heavy snow", icon: "./icons/wi-snow.svg" }],
  [77, { label: "Snow grains", icon: "./icons/wi-snowflake-cold.svg" }],
  [80, { label: "Slight rain showers", icon: "./icons/wi-showers.svg" }],
  [81, { label: "Rain showers", icon: "./icons/wi-showers.svg" }],
  [82, { label: "Violent rain showers", icon: "./icons/wi-storm-showers.svg" }],
  [85, { label: "Slight snow showers", icon: "./icons/wi-day-snow.svg" }],
  [86, { label: "Heavy snow showers", icon: "./icons/wi-snow.svg" }],
  [95, { label: "Thunderstorm", icon: "./icons/wi-thunderstorm.svg" }],
  [96, { label: "Thunderstorm with hail", icon: "./icons/wi-day-hail.svg" }],
  [99, { label: "Heavy thunderstorm with hail", icon: "./icons/wi-day-hail.svg" }],
]);

function weatherForCode(code, isDay = 1) {
  const condition = CONDITIONS.get(Number(code));
  if (!condition) return { label: "Unavailable", icon: "./icons/wi-na.svg" };

  if (Number(isDay) === 0) {
    if (Number(code) === 0 || Number(code) === 1) {
      return { ...condition, icon: "./icons/wi-night-clear.svg" };
    }
    if (Number(code) === 2) {
      return { ...condition, icon: "./icons/wi-night-alt-cloudy.svg" };
    }
  }

  return condition;
}

function forecastDayLabel(date, index) {
  if (index === 0) return "Today";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00+09:00`));
}

function parseForecast(data) {
  const current = data?.current;
  const daily = data?.daily;
  const dailyFields = [
    daily?.time,
    daily?.weather_code,
    daily?.temperature_2m_max,
    daily?.temperature_2m_min,
  ];

  if (
    !Number.isFinite(current?.temperature_2m)
    || !Number.isFinite(current?.weather_code)
    || !Array.isArray(dailyFields[0])
    || dailyFields[0].length === 0
    || dailyFields.some((field) => !Array.isArray(field) || field.length !== dailyFields[0].length)
    || daily.time.some((date, index) => (
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !Number.isFinite(daily.weather_code[index])
      || !Number.isFinite(daily.temperature_2m_max[index])
      || !Number.isFinite(daily.temperature_2m_min[index])
    ))
  ) {
    throw new Error("Weather data has an invalid format.");
  }

  return {
    current: {
      temperature: Math.round(current.temperature_2m),
      ...weatherForCode(current.weather_code, current.is_day),
    },
    days: daily.time.map((date, index) => ({
      date,
      code: daily.weather_code[index],
      high: Math.round(daily.temperature_2m_max[index]),
      low: Math.round(daily.temperature_2m_min[index]),
    })),
  };
}

async function fetchFukuokaForecast(fetchImpl = fetch) {
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: "33.5904",
    longitude: "130.4017",
    current: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "Asia/Tokyo",
    forecast_days: "7",
  });

  const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Unable to fetch weather (${response.status}).`);
  }

  return parseForecast(await response.json());
}

globalThis.WeatherWidget = { weatherForCode, forecastDayLabel, parseForecast, fetchFukuokaForecast };
})();
