import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  window.ENV.SUPABASE_URL,
  window.ENV.SUPABASE_KEY
);

export function subscribeToQueue(queueId, callback) {
  return supabase
    .channel("waqtek-queue-" + queueId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tickets",
        filter: `queue_id=eq.${queueId}`
      },
      callback
    )
    .subscribe();
}
