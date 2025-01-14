import { Context, Hono } from "hono";
import { Buffer } from "buffer";
import { supportedLanguages } from "../supportedLanguages";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
export interface Env {
  ACCESS_KEY_ID: string;
  SECRET_ACCESS_KEY: string;
  AI: Ai;
}
const app = new Hono<{ Bindings: CloudflareBindings }>();
let r2Client: S3Client | undefined;
async function uploadString(
  fileContent: string,
  bucketName: string,
  objectKey: string,
  c: Context
) {
  try {
    const uploadParams = {
      Bucket: bucketName,
      Key: objectKey,
      Body: fileContent, // The string content goes here
      ContentType: "text/plain", // Set appropriate content type
    };

    const command = new PutObjectCommand(uploadParams);
    if (!r2Client) {
      r2Client = new S3Client({
        endpoint:
          "https://3cbf94b28a5985c61e373c53ccf00753.r2.cloudflarestorage.com", // Replace with your R2 endpoint
        region: "auto", // R2 uses 'auto' for the region
        credentials: {
          accessKeyId: c.env.ACCESS_KEY_ID, // Replace with your Access Key
          secretAccessKey: c.env.SECRET_ACCESS_KEY, // Replace with your Secret Key
        },
      });
    }
    const response = await r2Client.send(command);

    console.log("File uploaded successfully:", response);
    console.log(
      `Public URL: https://${bucketName}.r2.cloudflarestorage.com/${objectKey}`
    );
  } catch (err) {
    console.error("Error uploading file:", err);
  }
}
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
  if (response.error) {
    {
      return c.text(response.error);
    }
  }

  if (response.vtt) {
    const vttFilename = `${filename.split(".").slice(0, -1).join(".")}.vtt`;
    await uploadString(response.vtt, "media", vttFilename, c);
  }

  return Response.json({ input: { audio: [], lang: lang }, response });
});

app.get("/lama", async (c: Context) => {
  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt: "What is the origin of the phrase Hello, World",
  });

  return new Response(JSON.stringify(response));
});
app.get("/uploadtxt", async (c: Context) => {
  await uploadString("test", "media", "test.txt", c);
  return c.text("File uploaded successfully!");
});

export default app;
