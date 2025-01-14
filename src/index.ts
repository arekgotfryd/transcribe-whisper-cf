import { Context, Hono } from "hono";
import { Buffer } from "buffer";
import { supportedLanguages } from "../supportedLanguages";
export interface Env {
  AI: Ai;
}
const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/transcribe", async (c: Context) => {
  const filename = c.req.query("filename");
  const lang = c.req.query("lang") || "en"; // Default to 'en' if lang is not provided

  if (!filename) {
    return c.text("Filename query parameter is required", 400);
  }
  if (!lang || !supportedLanguages.includes(lang)) {
    return c.text("Invalid language", 400);
  }

  const res = await fetch(
    `https://pub-4b41464ccabc4f95b1a65893433ef561.r2.dev/${filename}`
  );
  const blob = await res.arrayBuffer();

  const input = {
    audio: Buffer.from(blob).toString("base64"),
    task: "transcribe",
    language: lang,
  };
  const response = await c.env.AI.run(
    "@cf/openai/whisper-large-v3-turbo",
    input
  );

  return Response.json({ input: { audio: [], lang: lang }, response });
});

app.get("/lama", async (c: Context) => {
  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt: "What is the origin of the phrase Hello, World",
  });

  return new Response(JSON.stringify(response));
});

export default app;
