import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import type { Env } from "../config/env.js";

export type AccessPayload = {
  sub: string;
  role: Role;
};

export function signAccessToken(env: Env, payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_EXPIRES_MIN}m`,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(env: Env, token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
  });
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }
  const obj = decoded as Record<string, unknown>;
  const sub = obj.sub;
  const role = obj.role;
  if (typeof sub !== "string" || typeof role !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub, role: role as Role };
}
