import "dotenv/config";
import { initializeDatabase } from "./init.js";

if (process.env.NODE_ENV === "production") {
  for (const name of [
    "MYSQL_HOST",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "MYSQL_DATABASE",
    "ADMIN_EMAIL",
    "ADMIN_KEY",
  ]) {
    if (!process.env[name] || process.env[name]!.startsWith("REEMPLAZAR_"))
      throw new Error(`Configure ${name} antes de desplegar.`);
  }
  if (process.env.ADMIN_KEY!.length !== 10)
    throw new Error("ADMIN_KEY debe tener exactamente 10 caracteres.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL!))
    throw new Error("ADMIN_EMAIL debe ser un correo válido.");
}
if (process.env.RUN_DB_INIT === "true") {
  const transient = new Set([
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENOTFOUND",
    "PROTOCOL_CONNECTION_LOST",
    "ER_SERVER_SHUTDOWN",
  ]);
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      await initializeDatabase();
      console.log("Tablas MySQL listas.");
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt === 20 || !code || !transient.has(code)) throw error;
      console.log(`Esperando MySQL (${attempt}/20)...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
await import("./index.js");
