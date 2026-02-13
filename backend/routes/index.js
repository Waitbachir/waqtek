import express from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import establishmentsRoutes from "./establishments.routes.js";
import iotRoutes from "./iot.routes.js";
import pushRoutes from "./push.routes.js";
import queuesRoutes from "./queues.routes.js";
import statsRoutes from "./stats.routes.js";
import subscriptionsRoutes from "./subscriptions.routes.js";
import ticketsRoutes from "./tickets.routes.js";
import videosRoutes from "./videos.routes.js";

const apiRouter = express.Router();

apiRouter.use("/admin", adminRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/establishments", establishmentsRoutes);
apiRouter.use("/iot", iotRoutes);
apiRouter.use("/push", pushRoutes);
apiRouter.use("/queues", queuesRoutes);
apiRouter.use("/stats", statsRoutes);
apiRouter.use("/subscriptions", subscriptionsRoutes);
apiRouter.use("/tickets", ticketsRoutes);
apiRouter.use("/videos", videosRoutes);

export default apiRouter;
