"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Loader2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FORMAT_OPTIONS,
  N_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  type Format,
  type GenerateRequest,
  type GenerateResponse,
  type HistoryItem,
  type Quality,
  type Size,
} from "@/lib/types";

type Initial = Partial<Omit<GenerateRequest, "prompt">> & { prompt?: string };

type Props = {
  initial?: Initial;
  resetKey?: number;
  onGenerated: (item: HistoryItem) => void;
};

const DEFAULT_VALUES: GenerateRequest = {
  prompt: "",
  size: "auto",
  quality: "auto",
  format: "png",
  n: 1,
};
const CLIENT_TIMEOUT_MS = 10 * 60 * 1000 + 10_000;

function makeInitial(initial?: Initial): GenerateRequest {
  return {
    prompt: initial?.prompt ?? DEFAULT_VALUES.prompt,
    size: initial?.size ?? DEFAULT_VALUES.size,
    quality: initial?.quality ?? DEFAULT_VALUES.quality,
    format: initial?.format ?? DEFAULT_VALUES.format,
    n: initial?.n ?? DEFAULT_VALUES.n,
  };
}

export function Composer({ initial, resetKey, onGenerated }: Props) {
  const [form, setForm] = useState<GenerateRequest>(() => makeInitial(initial));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(makeInitial(initial));
    setError(null);
    // resetKey is intentionally part of deps to force re-sync on parent trigger
  }, [initial, resetKey]);

  const canSubmit = form.prompt.trim().length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      const json = (await res.json()) as
        | GenerateResponse
        | { error: string };
      if (!res.ok || "error" in json) {
        const msg = "error" in json ? json.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const item: HistoryItem = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        prompt: form.prompt.trim(),
        size: form.size,
        quality: form.quality,
        format: form.format,
        n: form.n,
        images: json.images.map((img) => img.src),
        favorite: false,
      };
      onGenerated(item);
      setForm((prev) => ({ ...prev, prompt: "" }));
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "请求超时（10 分钟），上游未返回。请重试或检查代理。"
          : e instanceof Error
            ? e.message
            : "生成失败";
      setError(msg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-10 mt-auto pb-2 pt-2">
      <div className="rounded-2xl border bg-background/80 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="px-4 pt-4 pb-2">
          <Textarea
            value={form.prompt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, prompt: e.target.value }))
            }
            placeholder="描述你想生成的图片..."
            rows={2}
            className="min-h-16 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          {error ? (
            <p className="mt-1 text-xs text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
          <ParamSelect
            label="尺寸"
            value={form.size}
            options={SIZE_OPTIONS}
            onChange={(v) => setForm((p) => ({ ...p, size: v as Size }))}
          />
          <ParamSelect
            label="质量"
            value={form.quality}
            options={QUALITY_OPTIONS}
            onChange={(v) =>
              setForm((p) => ({ ...p, quality: v as Quality }))
            }
          />
          <ParamSelect
            label="格式"
            value={form.format}
            options={FORMAT_OPTIONS}
            onChange={(v) => setForm((p) => ({ ...p, format: v as Format }))}
          />
          <ParamSelect
            label="数量"
            value={String(form.n)}
            options={N_OPTIONS.map(String)}
            onChange={(v) =>
              setForm((p) => ({ ...p, n: Number.parseInt(v, 10) || 1 }))
            }
          />
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              disabled
              title="附件功能暂未开放"
            >
              <Paperclip />
              <span className="sr-only">附件</span>
            </Button>
            <Button
              size="icon"
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ArrowUp />
              )}
              <span className="sr-only">生成</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ParamSelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
};

function ParamSelect({ label, value, options, onChange }: ParamSelectProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="min-w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
