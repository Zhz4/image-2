"use client";

import type { HistoryItem } from "@/lib/types";

import { HistoryItemCard } from "./history-item-card";
import type { HistoryFilter } from "./history-toolbar";

type Props = {
  items: HistoryItem[];
  filter: HistoryFilter;
  query: string;
  favoritesOnly: boolean;
  onFavorite: (id: string) => void;
  onRegenerate: (item: HistoryItem) => void;
  onEdit: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
};

export function HistoryList({
  items,
  filter,
  query,
  favoritesOnly,
  onFavorite,
  onRegenerate,
  onEdit,
  onDelete,
}: Props) {
  const q = query.trim().toLowerCase();
  const filtered = items.filter((it) => {
    if (favoritesOnly && !it.favorite) return false;
    if (filter === "favorites" && !it.favorite) return false;
    if (q && !it.prompt.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex min-h-40 flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        {items.length === 0
          ? "还没有生成记录，从下方输入提示词开始吧"
          : "没有匹配的结果"}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {filtered.map((item) => (
        <HistoryItemCard
          key={item.id}
          item={item}
          onFavorite={onFavorite}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
