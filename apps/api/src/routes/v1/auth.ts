import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { loadEnv } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { signAccessToken } from "../../lib/jwt.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { serializeUser } from "../../lib/serialize.js";
import { generateRefreshToken, hashToken } from "../../lib/tokens.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authLimiter } from "../../middlewares/rate-limit.js";
import { validateBody } from "../../middlewares/validate.js";

export const REFRESH_COOKIE = "sf_refresh";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function setRefreshCookie(res: Response, userId: string): Promise<string> {
  const env = loadEnv();
  const raw = generateRefreshToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  const secure = env.COOKIE_SECURE ?? env.NODE_ENV === "production";
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return raw;
}

async function clearRefreshToken(cookieVal: string | undefined): Promise<void> {
  if (!cookieVal) return;
  const tokenHash = hashToken(cookieVal);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  async (req, res, next) => {
    try {
      const { email, password, name } = req.body as z.infer<typeof registerSchema>;
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        next(new AppError(409, "EMAIL_IN_USE", "Email already registered"));
        return;
      }
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, passwordHash, name, role: "AGENT" },
      });
      await setRefreshCookie(res, user.id);
      const env = loadEnv();
      const accessToken = signAccessToken(env, { sub: user.id, role: user.role });
      res.status(201).json({
        accessToken,
        user: serializeUser(user),
      });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        next(new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
        return;
      }
      const ok = await verifyPassword(user.passwordHash, password);
      if (!ok) {
        next(new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
        return;
      }
      await setRefreshCookie(res, user.id);
      const env = loadEnv();
      const accessToken = signAccessToken(env, { sub: user.id, role: user.role });
      res.json({
        accessToken,
        user: serializeUser(user),
      });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post("/logout", async (req, res, next) => {
  try {
    const raw = req.cookies[REFRESH_COOKIE] as string | undefined;
    await clearRefreshToken(raw);
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

authRouter.post("/refresh", authLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (!raw) {
      next(new AppError(401, "NO_REFRESH", "Missing refresh token"));
      return;
    }
    const tokenHash = hashToken(raw);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (
      !record ||
      record.revokedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      res.clearCookie(REFRESH_COOKIE, { path: "/" });
      next(new AppError(401, "INVALID_REFRESH", "Invalid refresh token"));
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) {
      next(new AppError(401, "INVALID_REFRESH", "User not found"));
      return;
    }
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    await setRefreshCookie(res, user.id);
    const env = loadEnv();
    const accessToken = signAccessToken(env, { sub: user.id, role: user.role });
    res.json({ accessToken, user: serializeUser(user) });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    });
    res.json({ user: serializeUser(user) });
  } catch (e) {
    next(e);
  }
});
