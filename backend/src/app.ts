import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requireAdmin } from "./auth.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "./db.js";
import {
  participantSchema,
  createDelegationSchema,
  type Participant,
  type Delegation,
} from "../../shared/rules.js";
import { createSheet } from "./pdf.js";
export const app = express();
const trustedProxy = process.env.TRUST_PROXY;
if (trustedProxy) {
  app.set(
    "trust proxy",
    /^\d+$/.test(trustedProxy)
      ? Number(trustedProxy)
      : trustedProxy.split(",").map((value) => value.trim()),
  );
}
const testMode = process.env.TEST_MODE === "true";
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            directives: {
              frameSrc: ["'self'", "blob:"],
              workerSrc: ["'self'", "blob:"],
              connectSrc: ["'self'", "blob:"],
              imgSrc: ["'self'", "data:", "blob:"],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
              ],
              fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "data:",
                "blob:",
              ],
            },
          }
        : false,
  }),
);
app.use(express.json({ limit: "1mb" }));
const closesAt =
  process.env.REGISTRATION_CLOSES_AT || "2026-11-14T00:00:00-05:00";
if (!Number.isFinite(Date.parse(closesAt)))
  throw new Error("REGISTRATION_CLOSES_AT inválido");
app.get("/api/event", async (_req, res, next) => {
  try {
    const [state] = await pool.query<RowDataPacket[]>(
      "SELECT finalizedAt FROM delegation WHERE id=1",
    );
    res.json({
      closesAt,
      opensAt: "2026-10-28T00:00:00-05:00",
      eventDate: "2026-11-23",
      open:
        Date.now() >= Date.parse("2026-10-28T00:00:00-05:00") &&
        Date.now() < Date.parse(closesAt) &&
        !state[0]?.finalizedAt,
    });
  } catch (error) {
    next(error);
  }
});
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ error: "No se pudo conectar con MySQL." });
  }
});
app.post(
  "/api/participants",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  async (req, res, next) => {
    const result = participantSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0].message });
      return;
    }
    if (
      Date.now() < Date.parse("2026-10-28T00:00:00-05:00") ||
      Date.now() >= Date.parse(closesAt)
    ) {
      res.status(403).json({ error: "El plazo de inscripción está cerrado." });
      return;
    }
    const db = await pool.getConnection().catch(next);
    if (!db) return;
    try {
      await db.beginTransaction();
      const [state] = await db.query<RowDataPacket[]>(
        "SELECT finalizedAt FROM delegation WHERE id=1 FOR UPDATE",
      );
      if (state[0]?.finalizedAt) {
        await db.rollback();
        res.status(409).json({ error: "La delegación ya fue consolidada." });
        return;
      }
      const p = result.data;
      const [insert] = await db.execute<ResultSetHeader>(
        "INSERT INTO participants (firstName,lastName,dni,dependency,phone,consent) VALUES (?,?,?,?,?,?)",
        [p.firstName, p.lastName, p.dni, p.dependency, p.phone, true],
      );
      await db.commit();
      res.status(201).json({
        code: `REC-${String(insert.insertId).padStart(5, "0")}`,
        message:
          "Su participación quedó registrada para la conformación de la delegación. El registro individual no equivale a la inscripción final ante la comisión.",
      });
    } catch (e) {
      await db.rollback();
      if ((e as { code: string }).code === "ER_DUP_ENTRY") {
        res.status(409).json({ error: "Este DNI ya se encuentra registrado." });
      } else next(e);
    } finally {
      db.release();
    }
  },
);
app.use(
  "/api/admin",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  requireAdmin,
);
app.get("/api/admin/roster", async (_req, res, next) => {
  try {
    const [people] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM participants ORDER BY dependency,lastName,firstName",
    );
    const [state] = await pool.query<RowDataPacket[]>(
      "SELECT data,finalizedAt FROM delegation WHERE id=1",
    );
    res.json({ people, state: state[0], testMode });
  } catch (e) {
    next(e);
  }
});
app.post("/api/admin/finalize", async (req, res, next) => {
  const parsed = createDelegationSchema(testMode).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const db = await pool.getConnection().catch(next);
  if (!db) return;
  try {
    await db.beginTransaction();
    const [state] = await db.query<RowDataPacket[]>(
      "SELECT finalizedAt FROM delegation WHERE id=1 FOR UPDATE",
    );
    if (state[0]?.finalizedAt) {
      await db.rollback();
      res.status(409).json({ error: "La delegación ya fue consolidada." });
      return;
    }
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM participants",
    );
    const ids = new Set(rows.map((p) => p.id));
    if (parsed.data.pairs.flat().some((id) => !ids.has(id))) {
      await db.rollback();
      res
        .status(400)
        .json({ error: "La nómina contiene participantes inexistentes." });
      return;
    }
    await db.execute(
      "UPDATE delegation SET data=?, finalizedAt=UTC_TIMESTAMP() WHERE id=1",
      [JSON.stringify({ ...parsed.data, testMode })],
    );
    await db.commit();
    res.json({
      message: "Delegación consolidada. Ya puede descargar la ficha final.",
    });
  } catch (e) {
    await db.rollback();
    next(e);
  } finally {
    db.release();
  }
});
app.get("/api/admin/sheet.pdf", async (_req, res, next) => {
  try {
    const [state] = await pool.query<RowDataPacket[]>(
      "SELECT data,finalizedAt FROM delegation WHERE id=1",
    );
    if (!state[0]?.finalizedAt) {
      res.status(409).json({ error: "Primero debe consolidar la delegación." });
      return;
    }
    const data = (
      typeof state[0].data === "string"
        ? JSON.parse(state[0].data)
        : state[0].data
    ) as Delegation & { testMode?: boolean };
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM participants",
    );
    const date = new Date(
      String(state[0].finalizedAt).replace(" ", "T") + "Z",
    ).toLocaleDateString("es-PE", { timeZone: "America/Lima" });
    const pdf = await createSheet(
      data,
      rows as Participant[],
      date,
      data.testMode === true,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="ficha-rectorado-undc.pdf"',
    });
    res.send(pdf);
  } catch (e) {
    next(e);
  }
});
app.use(express.static("dist/frontend"));
app.get("/{*path}", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Ruta no encontrada." });
    return;
  }
  res.sendFile("index.html", { root: "dist/frontend" });
});
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err instanceof Error ? err.message : "Error interno");
    res.status(500).json({
      error:
        "No se pudo completar la operación. Verifique la conexión y configuración del servidor.",
    });
  },
);
