import { supabase } from "../realtime/supabase.js";

export async function createTicket(queueId) {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      queue_id: queueId,
      status: "WAITING"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function callNextTicket(queueId) {
  const { data, error } = await supabase
    .from("tickets")
    .update({
      status: "CALLED",
      called_at: new Date()
    })
    .eq("queue_id", queueId)
    .eq("status", "WAITING")
    .order("created_at", { ascending: true })
    .limit(1)
    .select()
    .single();

  if (error) throw error;
  return data;
}

