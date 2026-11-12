import { app } from "./app.js";
import { pool } from "./db.js";
const host = process.env.HOST || "0.0.0.0";
const server = app.listen(Number(process.env.PORT || 3001), host, () =>
  console.log(`API UNDC: http://${host}:${process.env.PORT || 3001}`),
);
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => {
      void pool
        .end()
        .then(() => {
          clearTimeout(timeout);
          process.exit(0);
        })
        .catch(() => process.exit(1));
    });
  });
