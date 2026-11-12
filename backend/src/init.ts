import "dotenv/config";
import mysql from "mysql2/promise";
import { pathToFileURL } from "node:url";

export async function initializeDatabase(
  createDatabase = process.env.DB_CREATE_DATABASE !== "false",
) {
  const database = process.env.MYSQL_DATABASE || "undc_danzas";
  if (!/^[a-zA-Z0-9_]+$/.test(database))
    throw new Error("MYSQL_DATABASE inválida");
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    ...(!createDatabase ? { database } : {}),
  });
  try {
    if (createDatabase) {
      await db.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      await db.query(`USE \`${database}\``);
    }
    await db.query(
      `CREATE TABLE IF NOT EXISTS participants (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, firstName VARCHAR(150) NOT NULL,lastName VARCHAR(150) NOT NULL,dni CHAR(8) NOT NULL UNIQUE,dependency VARCHAR(150) NOT NULL,phone CHAR(9) NOT NULL,consent BOOLEAN NOT NULL,createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    );
    await db.query(
      `CREATE TABLE IF NOT EXISTS delegation (id INT PRIMARY KEY, data JSON NULL, finalizedAt TIMESTAMP NULL)`,
    );
    await db.query("INSERT IGNORE INTO delegation (id) VALUES (1)");
  } finally {
    await db.end();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await initializeDatabase();
  console.log("Base de datos lista.");
}
