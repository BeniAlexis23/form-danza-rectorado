import { test } from "node:test";
import express from "express";
import request from "supertest";
import { requireAdmin } from "./auth.js";

test("acceso con correo y clave de diez caracteres", async () => {
  const previousEmail = process.env.ADMIN_EMAIL,
    previousKey = process.env.ADMIN_KEY;
  const app = express();
  app.get("/admin", requireAdmin, (_req, res) => res.json({ ok: true }));
  try {
    process.env.ADMIN_EMAIL = "coordinacion@example.test";
    process.env.ADMIN_KEY = "Ab12xy34Z9";
    await request(app).get("/admin").expect(401);
    await request(app)
      .get("/admin")
      .set("Authorization", "Bearer Ab12xy34Z9")
      .expect(401);
    await request(app)
      .get("/admin")
      .set("Authorization", "Bearer Ab12xy34Z9")
      .set("X-Admin-Email", "otro@example.test")
      .expect(401);
    await request(app)
      .get("/admin")
      .set("Authorization", "Bearer Wrong12345")
      .set("X-Admin-Email", "coordinacion@example.test")
      .expect(401);
    await request(app)
      .get("/admin")
      .set("Authorization", "Bearer Ab12xy34Z9")
      .set("X-Admin-Email", "COORDINACION@example.test")
      .expect(200)
      .expect("Cache-Control", "no-store");
    for (const invalidKey of ["123456", "123456789", "12345678901", ""]) {
      process.env.ADMIN_KEY = invalidKey;
      await request(app).get("/admin").expect(503);
    }
    process.env.ADMIN_KEY = "Ab12xy34Z9";
    process.env.ADMIN_EMAIL = "";
    await request(app).get("/admin").expect(503);
  } finally {
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
    if (previousKey === undefined) delete process.env.ADMIN_KEY;
    else process.env.ADMIN_KEY = previousKey;
  }
});
