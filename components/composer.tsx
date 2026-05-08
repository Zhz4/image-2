"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Image as ImageIcon, Paperclip, Sparkles } from "lucide-react";
import gsap from "gsap";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  onStart: (taskId: string, request: GenerateRequest) => void;
  onSuccess: (taskId: string, item: HistoryItem) => void;
  onError: (taskId: string, message: string) => void;
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

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function Composer({
  initial,
  resetKey,
  onStart,
  onSuccess,
  onError,
}: Props) {
  const [form, setForm] = useState<GenerateRequest>(() => makeInitial(initial));
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const sendShineRef = useRef<HTMLSpanElement>(null);
  const sparkleRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rootRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
      );

      if (auraRef.current) {
        gsap.to(auraRef.current, {
          backgroundPosition: "200% 50%",
          duration: 8,
          ease: "none",
          repeat: -1,
        });
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setForm(makeInitial(initial));
      setError(null);
    }, 0);

    return () => window.clearTimeout(id);
  }, [initial, resetKey]);

  const canSubmit = form.prompt.trim().length > 0;

  function playSendShine() {
    if (!sendShineRef.current) return;
    gsap.fromTo(
      sendShineRef.current,
      { x: "-120%", opacity: 0.9 },
      { x: "120%", opacity: 0, duration: 0.7, ease: "power2.out" },
    );
  }

  function pulseSparkle() {
    if (!sparkleRef.current) return;
    gsap.fromTo(
      sparkleRef.current,
      { scale: 0.6, opacity: 0, rotate: -30 },
      {
        scale: 1,
        opacity: 1,
        rotate: 0,
        duration: 0.4,
        ease: "back.out(2.4)",
      },
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    const taskId = makeId();
    const request: GenerateRequest = { ...form, prompt: form.prompt.trim() };

    if (sendRef.current) {
      gsap.fromTo(
        sendRef.current,
        { scale: 0.9 },
        { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.5)" },
      );
    }
    playSendShine();
    pulseSparkle();

    onStart(taskId, request);
    setForm((prev) => ({ ...prev, prompt: "" }));

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
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
        id: makeId(),
        createdAt: Date.now(),
        prompt: request.prompt,
        size: request.size,
        quality: request.quality,
        format: request.format,
        n: request.n,
        images: json.images.map((img) => img.src),
        favorite: false,
        durationMs: Date.now() - startedAt,
      };
      onSuccess(taskId, item);
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "请求超时（10 分钟），上游未返回。请重试或检查代理。"
          : e instanceof Error
            ? e.message
            : "生成失败";
      setError(msg);
      onError(taskId, msg);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return (
    <div ref={rootRef} className="sticky bottom-0 z-10 mt-auto pb-2 pt-2">
      <div
        className={cn(
          "group/composer relative rounded-2xl transition-all duration-500",
          focused
            ? "shadow-[0_8px_40px_-8px_rgba(99,102,241,0.35)]"
            : "shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)]",
        )}
      >
        <div
          ref={auraRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500",
            focused && "opacity-100",
          )}
          style={{
            background:
              "linear-gradient(110deg, rgba(168,85,247,0.55), rgba(56,189,248,0.55), rgba(236,72,153,0.55), rgba(168,85,247,0.55))",
            backgroundSize: "200% 100%",
            padding: 1,
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-6 -z-10 rounded-[28px] opacity-0 blur-2xl transition-opacity duration-700",
            focused && "opacity-60",
          )}
          style={{
            background:
              "radial-gradient(60% 80% at 30% 50%, rgba(168,85,247,0.25), transparent), radial-gradient(60% 80% at 75% 60%, rgba(56,189,248,0.22), transparent)",
          }}
        />

        <div className="relative overflow-hidden rounded-2xl border bg-background/85 backdrop-blur-xl supports-backdrop-filter:bg-background/65">
          <div className="relative px-4 pt-4 pb-2">
            <div className="flex items-start gap-2">
              <Sparkles
                ref={sparkleRef}
                aria-hidden
                className={cn(
                  "mt-1.5 size-4 shrink-0 transition-colors duration-300",
                  focused ? "text-primary" : "text-muted-foreground/60",
                )}
              />
              <Textarea
                value={form.prompt}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, prompt: e.target.value }))
                }
                placeholder="描述你想生成的图片，越具体越精彩…"
                rows={2}
                className="min-h-16 flex-1 resize-none border-0 bg-transparent px-0 text-[15px] leading-6 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleSubmit();
                  }
                }}
              />
            </div>
            {error ? (
              <p className="mt-1 pl-6 text-xs text-destructive">{error}</p>
            ) : null}
            <div className="pointer-events-none absolute right-4 top-3 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/50 opacity-0 transition-opacity duration-300 group-focus-within/composer:opacity-100">
              <kbd className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
                ⌘
              </kbd>
              <span>+</span>
              <kbd className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-border/60 bg-linear-to-b from-transparent to-muted/15 px-3 py-2.5">
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
              onChange={(v) =>
                setForm((p) => ({ ...p, format: v as Format }))
              }
            />
            <ParamSelect
              label="数量"
              value={String(form.n)}
              options={N_OPTIONS.map(String)}
              onChange={(v) =>
                setForm((p) => ({ ...p, n: Number.parseInt(v, 10) || 1 }))
              }
            />

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                disabled
                title="附件功能暂未开放"
                className="group/attach relative text-muted-foreground/70 transition-all hover:text-foreground disabled:opacity-50"
              >
                <Paperclip className="transition-transform duration-300 group-hover/attach:-rotate-12 group-hover/attach:scale-110" />
                <span className="sr-only">附件</span>
              </Button>

              <button
                ref={sendRef}
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "group/send relative inline-flex size-9 items-center justify-center overflow-hidden rounded-md text-sm font-medium transition-all duration-300",
                  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  canSubmit
                    ? "bg-linear-to-br from-fuchsia-500 via-violet-500 to-sky-500 text-white shadow-[0_4px_20px_-4px_rgba(168,85,247,0.6)] hover:shadow-[0_6px_28px_-2px_rgba(168,85,247,0.75)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                    : "cursor-not-allowed bg-muted text-muted-foreground/50",
                )}
                title={canSubmit ? "生成（⌘ + ↵）" : "请输入提示词"}
              >
                <span
                  ref={sendShineRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/60 to-transparent"
                  style={{ opacity: 0 }}
                />
                {canSubmit ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-md opacity-0 transition-opacity duration-500 group-hover/send:opacity-100"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 120%, rgba(255,255,255,0.5), transparent 60%)",
                    }}
                  />
                ) : null}
                <ArrowUp
                  className={cn(
                    "relative size-4 transition-transform duration-300",
                    canSubmit && "group-hover/send:-translate-y-0.5",
                  )}
                />
                {canSubmit ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/15"
                  />
                ) : null}
                <span className="sr-only">生成</span>
              </button>
            </div>
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
    <div className="group/param flex flex-col gap-0.5">
      <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors duration-200 group-hover/param:text-foreground/80 group-focus-within/param:text-primary">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          size="sm"
          className="min-w-27.5 border-border/60 bg-background/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-background/80 hover:shadow-sm data-[state=open]:border-primary/50 data-[state=open]:ring-2 data-[state=open]:ring-primary/20"
        >
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

// Suppress unused import — reserved for future preview affordance.
void ImageIcon;
