import { Context, Hono } from 'hono'
import { Buffer } from 'buffer';
export interface Env {
  AI: Ai;
}
const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/transcribe', async (c: Context) => {
    // const res = await fetch(
    //   "https://github.com/Azure-Samples/cognitive-services-speech-sdk/raw/master/samples/cpp/windows/console/samples/enrollment_audio_katie.wav"
    // );
    const res = await fetch(
      "https://pub-4b41464ccabc4f95b1a65893433ef561.r2.dev/yt1z.net%20-%20Juliette%20Binoche%20and%20Ralph%20Fiennes%E2%80%99s%20Closet%20Picks.mp3"
    );
    const blob = await res.arrayBuffer();

    const input = {
      audio: Buffer.from(blob).toString('base64'),
    };
    console.log("AI")
    console.log(c.env)
    console.log(c.env.AI)
    const response = await c.env.AI.run(
      "@cf/openai/whisper-large-v3-turbo",
      input
    );

    return Response.json({ input: { audio: [] }, response });
})

app.get('/lama', async (c: Context) => {
    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: "What is the origin of the phrase Hello, World",
    });

    return new Response(JSON.stringify(response));
})

export default app