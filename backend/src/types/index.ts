export type Size = "auto" | "1024x1024" | "1024x1536" | "1536x1024";
export type Quality = "auto" | "low" | "medium" | "high";
export type Format = "png" | "jpeg" | "webp";

export type GenerateRequest = {
  prompt: string;
  size: Size;
  quality: Quality;
  format: Format;
  n: number;
  referenceImages?: ReferenceImage[];
};

export type ReferenceImage = {
  name: string;
  type: string;
  dataUrl: string;
};

export type GenerateResponse = {
  images: { src: string }[];
  created: number;
};

export type HistoryItem = {
  id: string;
  createdAt: number;
  prompt: string;
  size: Size;
  quality: Quality;
  format: Format;
  n: number;
  images: string[];
  favorite: boolean;
  durationMs?: number;
};

export const SIZE_OPTIONS: Size[] = [
  "auto",
  "1024x1024",
  "1024x1536",
  "1536x1024",
];
export const QUALITY_OPTIONS: Quality[] = ["auto", "low", "medium", "high"];
export const FORMAT_OPTIONS: Format[] = ["png", "jpeg", "webp"];
export const N_OPTIONS = [1, 2, 3, 4] as const;
