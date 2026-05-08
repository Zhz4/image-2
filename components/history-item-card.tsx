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
    <Card className="flex flex-row gap-4 p-3">
      <div className="relative shrink-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item.prompt}
            loading="lazy"
            className="size-32 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-32 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            no image
          </div>
        )}
        <div className="absolute left-1 top-1 flex flex-col gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {aspectLabel(item.size)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {dimensionLabel(item.size)}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <p className="line-clamp-3 text-sm leading-relaxed">{item.prompt}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {item.size}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {item.quality}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {item.format}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            ×{item.n}
          </Badge>
        </div>
        <div className="mt-auto flex items-center justify-end gap-1 pt-2">
          <Button
            variant="ghost"
            size="icon-sm"
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
            size="icon-sm"
            onClick={() => onRegenerate(item)}
            title="重新生成"
          >
            <RotateCcw />
            <span className="sr-only">重新生成</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(item)}
            title="编辑参数"
          >
            <Pencil />
            <span className="sr-only">编辑</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
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
