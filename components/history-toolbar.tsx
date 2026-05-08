"use client";

import { Search, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type HistoryFilter = "all" | "favorites";

type Props = {
  filter: HistoryFilter;
  onFilterChange: (v: HistoryFilter) => void;
  query: string;
  onQueryChange: (v: string) => void;
  favoritesOnly: boolean;
  onFavoritesToggle: () => void;
};

export function HistoryToolbar({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  favoritesOnly,
  onFavoritesToggle,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={favoritesOnly ? "default" : "outline"}
        size="icon-sm"
        onClick={onFavoritesToggle}
        title="只看收藏"
      >
        <Star className={cn(favoritesOnly && "fill-current")} />
        <span className="sr-only">收藏过滤</span>
      </Button>
      <Select value={filter} onValueChange={(v) => onFilterChange(v as HistoryFilter)}>
        <SelectTrigger size="sm" className="min-w-[120px]">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="favorites">已收藏</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="搜索提示词、参数..."
          className="pl-9"
        />
      </div>
    </div>
  );
}
