import { useEffect, useRef } from "react";
import api, { getToken } from "@/lib/api";

/**
 * Persists temperature/humidity changes to MongoDB through the Express API.
 * Only runs for signed-in users, mirroring the previous behaviour.
 */
export function useHistoryLogger(temperature: number, humidity: number) {
  const lastTemp = useRef<number | null>(null);
  const lastHumidity = useRef<number | null>(null);

  useEffect(() => {
    if (temperature === 0 && humidity === 0) return;
    if (!getToken()) return;

    const changed =
      (lastTemp.current !== null && lastTemp.current !== temperature) ||
      (lastHumidity.current !== null && lastHumidity.current !== humidity);

    lastTemp.current = temperature;
    lastHumidity.current = humidity;

    if (!changed) return;

    api
      .post("/sensors", { temperature, humidity, source: "dashboard" })
      .catch(() => {
        /* history logging is best-effort */
      });
  }, [temperature, humidity]);
}
