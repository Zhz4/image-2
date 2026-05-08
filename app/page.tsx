"use client";

import { useState } from "react";

import { AnnouncementCard } from "@/components/announcement-card";
import { Composer } from "@/components/composer";
import { HistoryList, type GeneratingTask } from "@/components/history-list";
import {
  HistoryToolbar,
  type HistoryFilter,
} from "@/components/history-toolbar";
import { useHistory } from "@/hooks/use-history";
import type { GenerateRequest, HistoryItem } from "@/lib/types";

type ComposerInitial = Partial<Omit<GenerateRequest, "prompt">> & {
  prompt?: string;
};

export default function Home() {
  const { items, add, remove, toggleFavorite } = useHistory();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [composerInitial, setComposerInitial] = useState<
    ComposerInitial | undefined
  >(undefined);
  const [composerKey, setComposerKey] = useState(0);
  const [generating, setGenerating] = useState<GeneratingTask[]>([]);

  function loadIntoComposer(item: HistoryItem) {
    setComposerInitial({
      prompt: item.prompt,
      size: item.size,
      quality: item.quality,
      format: item.format,
      n: item.n,
    });
    setComposerKey((k) => k + 1);
  }

  function handleStart(taskId: string, request: GenerateRequest) {
    setGenerating((prev) => [{ id: taskId, request }, ...prev]);
  }

  function handleSuccess(taskId: string, item: HistoryItem) {
    setGenerating((prev) => prev.filter((t) => t.id !== taskId));
    add(item);
  }

  function handleError(taskId: string) {
    setGenerating((prev) => prev.filter((t) => t.id !== taskId));
  }

  return (
    <div className="mx-auto flex w-full max-w-325 flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <AnnouncementCard />
      <HistoryToolbar
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        favoritesOnly={favoritesOnly}
        onFavoritesToggle={() => setFavoritesOnly((v) => !v)}
      />
      <HistoryList
        items={items}
        generating={generating}
        filter={filter}
        query={query}
        favoritesOnly={favoritesOnly}
        onFavorite={toggleFavorite}
        onRegenerate={loadIntoComposer}
        onEdit={loadIntoComposer}
        onDelete={remove}
      />
      <div className="mx-auto w-full max-w-[865px]">
        <Composer
          initial={composerInitial}
          resetKey={composerKey}
          onStart={handleStart}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
    </div>
  );
}
