import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useHistoryLogger(temperature: number, humidity: number) {
  const lastTemp = useRef<number | null>(null);
  const lastHumidity = useRef<number | null>(null);

  useEffect(() => {
    if (temperature === 0 && humidity === 0) return;

    const logData = async () => {
      // Check if user is authenticated (admin) before logging
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (lastTemp.current !== null && lastTemp.current !== temperature) {
        await supabase.functions.invoke("admin-api", {
          body: { action: "log_history", type: "temperature", value: temperature },
        });
      }
      lastTemp.current = temperature;

      if (lastHumidity.current !== null && lastHumidity.current !== humidity) {
        await supabase.functions.invoke("admin-api", {
          body: { action: "log_history", type: "humidity", value: humidity },
        });
      }
      lastHumidity.current = humidity;
    };

    logData();
  }, [temperature, humidity]);
}
