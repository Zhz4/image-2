import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import https from "node:https";
import type { IncomingMessage } from "node:http";

export type ImageMimeType = "image/png" | "image/jpeg" | "image/webp";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
};

function getR2Config(): R2Config {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!accountId) throw new Error("CLOUDFLARE_R2_ACCOUNT_ID is not configured");
  if (!accessKeyId) throw new Error("CLOUDFLARE_R2_ACCESS_KEY_ID is not configured");
  if (!secretAccessKey) throw new Error("CLOUDFLARE_R2_SECRET_ACCESS_KEY is not configured");
  if (!bucketName) throw new Error("CLOUDFLARE_R2_BUCKET_NAME is not configured");
  if (!publicUrl) throw new Error("CLOUDFLARE_R2_PUBLIC_URL is not configured");
  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

let s3Client: S3Client | null = null;
let r2Config: R2Config | null = null;

function getR2(): { client: S3Client; config: R2Config } {
  if (s3Client && r2Config) return { client: s3Client, config: r2Config };
  r2Config = getR2Config();
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });
  return { client: s3Client, config: r2Config };
}

function fetchAsStream(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== undefined && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        reject(new Error(`Failed to fetch image from OpenAI URL: HTTP ${res.statusCode}`));
        return;
      }
      resolve(res);
    });
    req.on("error", reject);
  });
}

type UploadImageSource = { url: string } | { b64_json: string } | { buffer: Buffer };

function normalizePublicUrl(publicUrl: string): string {
  return publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
}

export function isR2PublicObjectUrl(value: string): boolean {
  const config = getR2Config();
  const base = new URL(`${normalizePublicUrl(config.publicUrl)}/`);
  const url = new URL(value);

  return (
    url.protocol === base.protocol &&
    url.host === base.host &&
    url.pathname.startsWith(base.pathname)
  );
}

export async function uploadImageToR2(
  source: UploadImageSource,
  key: string,
  contentType: ImageMimeType,
): Promise<string> {
  const { client, config } = getR2();

  const body: Readable | Buffer =
    "url" in source
      ? await fetchAsStream(source.url)
      : "buffer" in source
        ? source.buffer
        : Buffer.from(source.b64_json, "base64");

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  const base = normalizePublicUrl(config.publicUrl);
  return `${base}/${key}`;
}
