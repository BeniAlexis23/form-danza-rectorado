import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";

function equal(actual: string, expected: string) {
  const left = Buffer.from(actual),
    right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const key = process.env.ADMIN_KEY || "";
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (key.length !== 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(503).json({
      error:
        "Configure ADMIN_EMAIL y ADMIN_KEY de exactamente 10 caracteres en el servidor.",
    });
    return;
  }
  const suppliedKey =
    req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] || "";
  const suppliedEmail = (req.get("X-Admin-Email") || "").trim().toLowerCase();
  const validKey = equal(suppliedKey, key);
  const validEmail = equal(suppliedEmail, email);
  if (!validKey || !validEmail) {
    res
      .status(401)
      .json({ error: "El correo o la clave de coordinación son incorrectos." });
    return;
  }
  next();
};
