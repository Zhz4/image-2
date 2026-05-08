"use client";

import { Check, Copy, Pencil, RotateCcw, Star, Trash2, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { HistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  item: HistoryItem;
  onFavorite: (id: string) => void;
  onRegenerate: (item: HistoryItem) => void;
  onEdit: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
};

function aspectLabel(size: HistoryItem["size"]): string {
  if (size === "auto") return "auto";
  const [w, h] = size.split("x").map((n) => Number.parseInt(n, 10));
  if (!w || !h) return size;
  if (w === h) return "≈1:1";
  if (w > h) return `≈${(w / h).toFixed(2)}:1`;
  return `≈1:${(h / w).toFixed(2)}`;
}

function dimensionLabel(size: HistoryItem["size"]): string {
  return size === "auto" ? "auto" : size.replace("x", "×");
}

function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ParamField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

export function HistoryItemCard({
  item,
  onFavorite,
  onRegenerate,
  onEdit,
  onDelete,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(item.images.length - 1, 0));
  const cover = item.images[0];
  const active = item.images[safeIndex] ?? cover;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function closeAnd(action: () => void) {
    setPreviewOpen(false);
    action();
  }

  const dimensionDisplay =
    item.size !== "auto"
      ? dimensionLabel(item.size)
      : naturalSize
        ? `${naturalSize.w}×${naturalSize.h}`
        : "auto";
  return (
    <Card className="h-40 w-full max-w-[404px] flex-row gap-0 overflow-hidden rounded-lg py-0 shadow-xs sm:w-[404px]">
      <div className="relative h-full w-40 shrink-0 bg-muted">
        {cover ? (
          <DialogPrimitive.Root open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogPrimitive.Trigger asChild>
              <div className="grid h-full w-full cursor-zoom-in grid-cols-2 gap-px bg-background/40">
                {item.images.slice(0, 4).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${item.id}-cover-${i}`}
                    src={src}
                    alt={`${item.prompt} #${i + 1}`}
                    loading="lazy"
                    className={cn(
                      "h-full w-full object-cover",
                      item.images.length === 1 && "col-span-2",
                      item.images.length === 3 && i === 0 && "row-span-2",
                    )}
                  />
                ))}
              </div>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <DialogPrimitive.Content
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(960px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              >
                <DialogPrimitive.Title className="sr-only">{item.prompt}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  图片预览：{item.size} · {item.quality} · {item.format}
                </DialogPrimitive.Description>

                {/* Image side */}
                <div className="relative flex w-1/2 shrink-0 flex-col items-center justify-center gap-3 bg-muted p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={active}
                    alt={item.prompt}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    className="max-h-[80vh] max-w-full rounded-md object-contain"
                  />
                  {item.images.length > 1 && (
                    <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
                      {item.images.map((src, i) => (
                        <button
                          key={`${item.id}-thumb-${i}`}
                          type="button"
                          onClick={() => setActiveIndex(i)}
                          className={cn(
                            "shrink-0 overflow-hidden rounded border-2 transition",
                            i === safeIndex
                              ? "border-primary"
                              : "border-transparent opacity-70 hover:opacity-100",
                          )}
                          title={`第 ${i + 1} 张`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`${item.prompt} #${i + 1}`}
                            className="h-14 w-14 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="pointer-events-none absolute left-4 top-4 flex gap-1">
                    <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
                      {aspectLabel(item.size)}
                    </Badge>
                    <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
                      {dimensionDisplay}
                    </Badge>
                    {item.images.length > 1 && (
                      <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
                        {safeIndex + 1}/{item.images.length}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Info side */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2 px-5 pt-5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>输入内容</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={copyPrompt}
                        title={copied ? "已复制" : "复制"}
                      >
                        {copied ? <Check /> : <Copy />}
                        <span className="sr-only">复制</span>
                      </Button>
                    </div>
                    <DialogPrimitive.Close asChild>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="关闭">
                        <X />
                        <span className="sr-only">关闭</span>
                      </Button>
                    </DialogPrimitive.Close>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-2">
                    <p className="mt-1 text-sm leading-6">{item.prompt}</p>

                    <div className="mt-5 text-xs font-medium text-muted-foreground">参数配置</div>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/40 px-4 py-3">
                      <ParamField label="尺寸" value={item.size} />
                      <ParamField label="质量" value={item.quality} />
                      <ParamField label="格式" value={item.format} />
                      <ParamField label="数量" value={`${item.n}`} />
                    </div>

                    <div className="mt-4 text-xs text-muted-foreground">
                      创建于 {formatCreatedAt(item.createdAt)}
                      {item.durationMs != null && (
                        <span> · 耗时 {formatDuration(item.durationMs)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t px-5 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={() => closeAnd(() => onRegenerate(item))}
                    >
                      <RotateCcw />
                      复用配置
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-600 hover:text-emerald-700"
                      onClick={() => closeAnd(() => onEdit(item))}
                    >
                      <Pencil />
                      编辑参数
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => closeAnd(() => onDelete(item.id))}
                    >
                      <Trash2 />
                      删除记录
                    </Button>
                    <div className="ml-auto">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onFavorite(item.id)}
                        title={item.favorite ? "取消收藏" : "收藏"}
                      >
                        <Star className={cn(item.favorite && "fill-current text-yellow-500")} />
                        <span className="sr-only">收藏</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            no image
          </div>
        )}
        <div className="pointer-events-none absolute left-2 top-2 flex gap-1">
          <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
            {aspectLabel(item.size)}
          </Badge>
          <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
            {dimensionLabel(item.size)}
          </Badge>
          {item.images.length > 1 && (
            <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
              ×{item.images.length}
            </Badge>
          )}
        </div>
        {item.durationMs != null && (
          <div className="pointer-events-none absolute bottom-2 right-2 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white shadow-sm">
            {formatDuration(item.durationMs)}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-3 py-3">
        <p className="line-clamp-2 min-h-10 text-sm leading-5">
          {item.prompt}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="rounded-sm border-0 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            {item.size}
          </Badge>
          <Badge variant="secondary" className="rounded-sm border-0 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            {item.quality}
          </Badge>
          <Badge variant="secondary" className="rounded-sm border-0 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            {item.format}
          </Badge>
          <Badge variant="secondary" className="rounded-sm border-0 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            ×{item.n}
          </Badge>
        </div>
        <div className="flex items-center justify-end gap-0.5 pt-2">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => onFavorite(item.id)}
            title={item.favorite ? "取消收藏" : "收藏"}
          >
            <Star
              className={cn(item.favorite && "fill-current text-yellow-500")}
            />
            <span className="sr-only">收藏</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => onRegenerate(item)}
            title="重新生成"
          >
            <RotateCcw />
            <span className="sr-only">重新生成</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => onEdit(item)}
            title="编辑参数"
          >
            <Pencil />
            <span className="sr-only">编辑</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => onDelete(item.id)}
            title="删除"
          >
            <Trash2 />
            <span className="sr-only">删除</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
