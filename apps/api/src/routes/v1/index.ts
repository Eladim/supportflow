import { Router } from "express";
import { activityFeedRouter } from "./activity-feed.js";
import { analyticsRouter } from "./analytics.js";
import { authRouter } from "./auth.js";
import { commentItemsRouter } from "./comment-items.js";
import { noteItemsRouter } from "./note-items.js";
import { notificationsRouter } from "./notifications.js";
import { ticketsRouter } from "./tickets.js";
import { uploadsRouter } from "./uploads.js";
import { usersRouter } from "./users.js";

export const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/tickets", ticketsRouter);
v1Router.use("/comments", commentItemsRouter);
v1Router.use("/notes", noteItemsRouter);
v1Router.use("/activity", activityFeedRouter);
v1Router.use("/notifications", notificationsRouter);
v1Router.use("/analytics", analyticsRouter);
v1Router.use("/", uploadsRouter);
