import app from "../src/app.js";

const server = app.listen(0, async () => {
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api`);
    const body = await res.json();
    console.log("status:", res.status, "body:", body.message);

    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    console.log("health status:", health.status);
  } finally {
    server.close();
    process.exit(0);
  }
});
