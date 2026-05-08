import { getImageModel, getOpenAI } from "@/lib/openai";
import type { Images } from "openai/resources/images";
import {
  FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  type Format,
  type GenerateRequest,
  type GenerateResponse,
  type Quality,
  type Size,
} from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = (await req.json()) as Partial<GenerateRequest>;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const size =
    typeof body.size === "string" &&
    (SIZE_OPTIONS as readonly string[]).includes(body.size)
      ? (body.size as Size)
      : "auto";
  const quality: Quality =
    typeof body.quality === "string" &&
    (QUALITY_OPTIONS as readonly string[]).includes(body.quality)
      ? (body.quality as Quality)
      : "auto";
  const format: Format =
    typeof body.format === "string" &&
    (FORMAT_OPTIONS as readonly string[]).includes(body.format)
      ? (body.format as Format)
      : "png";
  const n =
    typeof body.n === "number" && body.n >= 1 && body.n <= 4
      ? Math.floor(body.n)
      : 1;

  try {
    const openai = getOpenAI();
    const model = getImageModel();
    const requestParams: Images.ImageGenerateParamsNonStreaming = {
      model,
      prompt,
      size,
      n,
      quality,
      output_format: format,
    };

    const responses = [await openai.images.generate(requestParams)];

    const imageCount = () =>
      responses.reduce(
        (total, response) => total + (response.data?.length ?? 0),
        0,
      );

    while (imageCount() < n && responses.length < n) {
      responses.push(
        await openai.images.generate({
          ...requestParams,
          n: n - imageCount(),
        }),
      );
    }

    const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
    const sources = responses
      .flatMap((response) => response.data ?? [])
      .map((d) =>
        d.url
          ? d.url
          : d.b64_json
            ? `data:${mime};base64,${d.b64_json}`
            : null,
      )
      .filter((s): s is string => Boolean(s))
      .slice(0, n);

    if (sources.length === 0) {
      return Response.json({ error: "model returned no images" }, { status: 502 });
    }

    const payload: GenerateResponse = {
      images: sources.map((src) => ({ src })),
      created: responses[0]?.created ?? Math.floor(Date.now() / 1000),
    };
    return Response.json(payload);
  } catch (e: unknown) {
    const err = e as {
      name?: string;
      status?: number;
      message?: string;
      error?: { message?: string };
    };
    const isTimeout =
      err.name === "APIConnectionTimeoutError" ||
      (typeof err.message === "string" &&
        err.message.toLowerCase().includes("timed out"));
    const status =
      typeof err.status === "number" ? err.status : isTimeout ? 504 : 500;
    const message = isTimeout
      ? "Image generation timed out. Try again, or increase OPENAI_REQUEST_TIMEOUT_MS."
      : err.error?.message ?? err.message ?? "image generation failed";
    return Response.json({ error: message }, { status });
  }
}
