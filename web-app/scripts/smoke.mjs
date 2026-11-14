import assert from "node:assert/strict";
const base = process.argv[2] ?? "http://localhost:3012";
const call = async (path, options) => {
  const response = await fetch(base + path, options);
  return { status: response.status, body: await response.json() };
};
const headers = { "Content-Type": "application/json" };
const created = await call("/api/sync", { method: "POST" });
assert.equal(created.status, 201);
assert.match(created.body.code, /^[A-HJ-NP-Z2-9]{8}$/);
const { code, readerToken } = created.body;
const path = "/api/sync/" + code;
const reader = { "X-Sync-Token": readerToken };
assert.equal(
  (await call(path, { headers: { "X-Sync-Token": "incorrect" } })).status,
  403,
);
assert.equal((await call(path, { headers: reader })).body.status, "pending");
assert.equal(
  (
    await call(path, {
      method: "POST",
      headers,
      body: JSON.stringify({ version: 99 }),
    })
  ).status,
  400,
);
assert.equal(
  (
    await call(path, {
      method: "POST",
      headers,
      body: JSON.stringify({ note: "x".repeat(49_000) }),
    })
  ).status,
  400,
);
const configuration = {
  version: 1,
  mainCity: { city: "Lincoln", district: "Nebraska", lat: 40.8, lon: -96.667 },
  cities: [{ city: "Omaha", district: "Nebraska", lat: 41.26, lon: -95.94 }],
  settings: {
    degrees: "fahrenheit",
    widgetBackgroundColorDark: "#ff1a1925",
    notificationSound: true,
  },
  exportedAt: new Date().toISOString(),
};
assert.equal(
  (
    await call(path, {
      method: "POST",
      headers,
      body: JSON.stringify(configuration),
    })
  ).status,
  200,
);
assert.equal(
  (
    await call(path, {
      method: "POST",
      headers,
      body: JSON.stringify(configuration),
    })
  ).status,
  409,
);
const received = await call(path, { headers: reader });
assert.equal(received.body.status, "received");
assert.deepEqual(received.body.configuration, configuration);
assert.equal(
  (
    await call(path, {
      method: "DELETE",
      headers: { "X-Sync-Token": "incorrect" },
    })
  ).status,
  403,
);
assert.equal(
  (await call(path, { method: "DELETE", headers: reader })).status,
  200,
);
assert.equal((await call(path, { headers: reader })).status, 410);
assert.equal((await call("/api/weather?lat=bad&lon=1")).status, 400);
assert.equal((await call("/api/cities?q=a")).body.results.length, 0);
console.log(
  "Pairing smoke passed: create, validate, publish, receive, reject overwrite, acknowledge, delete; malformed requests rejected.",
);
