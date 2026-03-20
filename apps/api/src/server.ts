import "./load-env.js";
import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { setIo } from "./sockets/io-registry.js";
import { registerSocketHandlers } from "./sockets/register-socket.js";

const env = loadEnv();
const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  },
});
setIo(io);
registerSocketHandlers(io);

server.listen(env.PORT, () => {
  console.log(`SupportFlow API http://localhost:${env.PORT}`);
  console.log(`Swagger http://localhost:${env.PORT}/api-docs`);
});
