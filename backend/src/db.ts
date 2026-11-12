import "dotenv/config";
import mysql from "mysql2/promise";
export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "undc_danzas",
  connectionLimit: 5,
  dateStrings: true,
});
pool.pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});
