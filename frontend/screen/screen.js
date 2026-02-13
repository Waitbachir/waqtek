import { subscribeToQueue } from "../js/modules/realtime.js";

const params = new URLSearchParams(location.search);
const queueId = params.get("queue");

if (!queueId) {
  document.body.innerHTML = "<h1>Queue ID manquant</h1>";
  throw new Error("Queue ID missing");
}

subscribeToQueue(queueId, (payload) => {
  if (payload.new?.status === "CALLED") {
    document.getElementById("current").innerText =
      payload.new.number || payload.new.id;
  }
});
