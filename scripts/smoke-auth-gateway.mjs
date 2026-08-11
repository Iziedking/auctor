const publicUrl = new URL(process.env.AUCTOR_PUBLIC_URL ?? "https://auctor.space");

async function requireResponse(path) {
  const url = new URL(path, publicUrl);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return { url, body: await response.text() };
}

const gateway = await requireResponse("/");
if (!gateway.body.includes("Preparing your agent")) {
  throw new Error(`${gateway.url} did not render the public authentication loader`);
}
if (gateway.body.includes("SYSTEM / LIVE")) {
  throw new Error(`${gateway.url} exposed authenticated product chrome before sign-in`);
}

const health = await requireResponse("/api/health");
let healthBody;
try {
  healthBody = JSON.parse(health.body);
} catch {
  throw new Error(`${health.url} did not return JSON`);
}
if (!healthBody || healthBody.status !== "ok") {
  throw new Error(`${health.url} did not report status ok`);
}

console.log(`Authentication gateway smoke passed for ${publicUrl.origin}`);
