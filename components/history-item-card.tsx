"use client";

import { Pencil, RotateCcw, Star, Trash2 } from "lucide-react";

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

export function HistoryItemCard({
  item,
  onFavorite,
  onRegenerate,
  onEdit,
  onDelete,
}: Props) {
  const cover = item.images[0];
  return (
    <Card className="h-40 w-full max-w-[404px] flex-row gap-0 overflow-hidden rounded-lg py-0 shadow-xs sm:w-[404px]">
      <div className="relative h-full w-40 shrink-0 bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item.prompt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            no image
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
            {aspectLabel(item.size)}
          </Badge>
          <Badge variant="secondary" className="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
            {dimensionLabel(item.size)}
          </Badge>
        </div>
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
