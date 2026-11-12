import { test, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { writeFileSync, mkdirSync } from "node:fs";
import { app } from "./app.js";
import { pool } from "./db.js";

// Run only against an explicitly named disposable test database.
if (!process.env.MYSQL_DATABASE?.endsWith("_test"))
  throw new Error("Use MYSQL_DATABASE with suffix _test.");
after(async () => {
  await pool.end();
});
test("registro, privacidad, duplicados, consolidación y ficha final", async () => {
  await pool.query("DELETE FROM participants");
  await pool.query(
    "UPDATE delegation SET data=NULL,finalizedAt=NULL WHERE id=1",
  );
  const auth = {
    Authorization: `Bearer ${process.env.ADMIN_KEY}`,
    "X-Admin-Email": process.env.ADMIN_EMAIL || "",
  };
  await request(app).get("/api/admin/roster").expect(401);
  await request(app).get("/api/health").expect(200);
  const ids: number[] = [];
  for (let i = 0; i < 20; i++) {
    await request(app)
      .post("/api/participants")
      .send({
        firstName: `Participante ${i + 1}`,
        lastName: "Prueba de integración",
        dni: String(70000000 + i),
        dependency: i % 2 ? "Oficina de Prueba" : "Rectorado",
        phone: "987654321",
        consent: true,
      })
      .expect(201);
  }
  await request(app)
    .post("/api/participants")
    .send({
      firstName: "Repetido",
      lastName: "Prueba",
      dni: "70000000",
      dependency: "Rectorado",
      phone: "987654321",
      consent: true,
    })
    .expect(409);
  const roster = await request(app)
    .get("/api/admin/roster")
    .set(auth)
    .expect(200);
  assert.equal(roster.body.people.length, 20);
  ids.push(...roster.body.people.map((p: { id: number }) => p.id));
  const data = {
    modality: "AFROPERUANA",
    dance: "Festejo de Cañete",
    minutes: 8,
    seconds: 30,
    review:
      "El festejo representa la riqueza de la tradición afroperuana de Cañete. Esta reseña se utiliza exclusivamente para comprobar la ficha de inscripción.",
    representative: "María Pérez Sánchez",
    dni: "45678912",
    phone: "987654321",
    pairs: Array.from({ length: 10 }, (_, i) => [ids[i * 2], ids[i * 2 + 1]]),
    acceptedBases: true,
  };
  await request(app)
    .post("/api/admin/finalize")
    .set(auth)
    .send({ ...data, pairs: data.pairs.slice(1) })
    .expect(400);
  await request(app)
    .post("/api/admin/finalize")
    .set(auth)
    .send(data)
    .expect(200);
  await request(app)
    .post("/api/participants")
    .send({
      firstName: "Fuera",
      lastName: "Nómina",
      dni: "80000001",
      dependency: "Rectorado",
      phone: "987654321",
      consent: true,
    })
    .expect(409);
  await request(app)
    .post("/api/admin/finalize")
    .set(auth)
    .send(data)
    .expect(409);
  const pdf = await request(app)
    .get("/api/admin/sheet.pdf")
    .set(auth)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    })
    .expect(200);
  assert.ok(pdf.body.subarray(0, 5).equals(Buffer.from("%PDF-")));
  mkdirSync("tmp/pdfs", { recursive: true });
  writeFileSync("tmp/pdfs/ficha-prueba.pdf", pdf.body);
});
