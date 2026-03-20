import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** Resolve apps/api/.env regardless of process.cwd() (e.g. monorepo root). */
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(apiRoot, ".env") });
