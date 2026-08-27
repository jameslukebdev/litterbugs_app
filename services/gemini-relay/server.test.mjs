import assert from "node:assert/strict";
import test from "node:test";
import {
  createHandler,
  loadConfig,
  MAX_PHOTO_BYTES,
  MODEL,
  PROJECT_ID,
} from "./server.mjs";

const secret = "test-only-relay-secret-with-more-than-32-characters";
const origin = "https://mvaygkflcjswtwchflrk.supabase.co";
const config = loadConfig({
  GEMINI_RELAY_SHARED_SECRET: secret,
  ALLOWED_PHOTO_ORIGIN: origin,
});
const reviewRequest = (body, authorization = `Bearer ${secret}`) => new Request(
  "https://relay.example/v1/review",
  {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  },
);
const signedPhoto =
  `${origin}/storage/v1/object/sign/report_photos/report/photo.jpg?token=signed`;

test("health route is public without exposing the review route", async () => {
  const handler = createHandler({ config });
  const health = await handler(new Request("https://relay.example/health"));
  const review = await handler(new Request("https://relay.example/v1/review", {
    method: "POST",
    body: "{}",
  }));

  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  assert.equal(review.status, 401);
});

test("rejects unauthorized calls before fetching anything", async () => {
  let fetched = false;
  const handler = createHandler({
    config,
    fetchImpl: async () => { fetched = true; throw new Error("unexpected"); },
  });
  const response = await handler(reviewRequest({
    promptVersion: "report-funding-v1",
    parts: [{ text: "review" }],
  }, "Bearer wrong"));
  assert.equal(response.status, 401);
  assert.equal(fetched, false);
});

test("rejects untrusted photo origins and unsigned storage paths", async () => {
  const handler = createHandler({ config });
  for (const photoUrl of [
    "https://attacker.example/storage/v1/object/sign/report_photos/a?token=x",
    `${origin}/storage/v1/object/public/report_photos/a?token=x`,
    `${origin}/storage/v1/object/sign/report_photos/a`,
  ]) {
    const response = await handler(reviewRequest({
      promptVersion: "report-funding-v1",
      parts: [{ photoUrl, mimeType: "image/jpeg" }],
    }));
    assert.equal(response.status, 400);
  }
});

test("rejects more than six photos and arbitrary model selection", async () => {
  const handler = createHandler({ config });
  const tooMany = await handler(reviewRequest({
    promptVersion: "funded-cleanup-v1",
    parts: Array.from({ length: 7 }, () => ({
      photoUrl: signedPhoto,
      mimeType: "image/jpeg",
    })),
  }));
  assert.equal(tooMany.status, 400);

  const arbitraryModel = await handler(reviewRequest({
    promptVersion: "report-funding-v1",
    model: "arbitrary-model",
    parts: [{ text: "review" }],
  }));
  assert.equal(arbitraryModel.status, 400);
});

test("rejects an oversized photo before reading its body", async () => {
  const handler = createHandler({
    config,
    fetchImpl: async (url) => {
      assert.equal(url, signedPhoto);
      return new Response("", {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(MAX_PHOTO_BYTES + 1),
        },
      });
    },
  });
  const response = await handler(reviewRequest({
    promptVersion: "report-funding-v1",
    parts: [{ photoUrl: signedPhoto, mimeType: "image/jpeg" }],
  }));
  assert.equal(response.status, 413);
});

test("uses the fixed production model, ADC token, schema, and private photo", async () => {
  const calls = [];
  const handler = createHandler({
    config,
    getAccessToken: async () => "adc-access-token",
    fetchImpl: async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url) === signedPhoto) {
        return new Response(Buffer.from([0xff, 0xd8, 0xff]), {
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      assert.equal(new URL(String(url)).origin, "https://aiplatform.googleapis.com");
      assert.match(String(url), new RegExp(`/projects/${PROJECT_ID}/`));
      assert.match(String(url), new RegExp(`/models/${MODEL}:generateContent$`));
      assert.equal(init.headers.Authorization, "Bearer adc-access-token");
      const body = JSON.parse(init.body);
      assert.match(body.systemInstruction.parts[0].text, /untrusted evidence/i);
      assert.equal(body.contents[0].parts[1].inlineData.data, "/9j/");
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.ok(body.generationConfig.responseSchema);
      return Response.json({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({
            decision: "pass",
            summary: "The evidence is usable.",
            reason_codes: ["usable"],
          }) }] },
        }],
      });
    },
  });
  const response = await handler(reviewRequest({
    promptVersion: "report-funding-v1",
    parts: [
      { text: "Review this report." },
      { photoUrl: signedPhoto, mimeType: "image/jpeg" },
    ],
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    decision: "pass",
    summary: "The evidence is usable.",
    reason_codes: ["usable"],
  });
  assert.equal(calls.length, 2);
});
