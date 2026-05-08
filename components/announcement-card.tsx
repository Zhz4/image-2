"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STORAGE_KEY = "image-2:announcement-dismissed";

export function AnnouncementCard() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (hidden) return null;

  return (
    <Card className="relative flex flex-row items-start gap-3 px-5 py-4">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bell className="size-4" />
      </div>
      <div className="flex-1 space-y-1 text-sm leading-relaxed">
        <p className="font-medium">系统维护通知</p>
        <p className="text-muted-foreground">已知问题都已经进行了修改。</p>
        <p className="text-muted-foreground">
          默认会上传到图集，有隐私需要开启隐私模式。
        </p>
        <p className="text-muted-foreground">
          大家生成图片的时候最好不要上传真人照片做暧昧动作，目前增加了用户 id ip
          追溯系统，如果有太过分的我真封号封 IP 了。
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute right-2 top-2"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, "1");
          setHidden(true);
        }}
      >
        <X />
        <span className="sr-only">关闭通知</span>
      </Button>
    </Card>
  );
}
