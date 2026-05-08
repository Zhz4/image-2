"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { Card } from "@/components/ui/card";
import type { GenerateRequest } from "@/lib/types";

type Props = {
  request: GenerateRequest;
};

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GeneratingCard({ request }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(rootRef.current, {
        opacity: 0,
        y: 12,
        scale: 0.96,
        duration: 0.45,
        ease: "power2.out",
      });

      gsap.to(sweepRef.current, {
        backgroundPositionX: "200%",
        duration: 1.6,
        ease: "none",
        repeat: -1,
      });

      gsap.to(ringRef.current, {
        rotate: 360,
        duration: 2.4,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      gsap.to([orb1Ref.current, orb2Ref.current, orb3Ref.current], {
        scale: 1.4,
        opacity: 0.9,
        duration: 1.1,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
      });

      gsap.to([orb1Ref.current, orb2Ref.current, orb3Ref.current], {
        x: "+=10",
        y: "-=6",
        duration: 1.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.22,
      });

      if (dotsRef.current) {
        const dots = dotsRef.current.querySelectorAll<HTMLSpanElement>("i");
        gsap.to(dots, {
          y: -4,
          opacity: 1,
          duration: 0.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.15,
        });
      }

      if (barsRef.current) {
        const bars = barsRef.current.querySelectorAll<HTMLDivElement>("i");
        gsap.fromTo(
          bars,
          { scaleX: 0.2 },
          {
            scaleX: 1,
            duration: 1,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true,
            stagger: 0.18,
            transformOrigin: "0% 50%",
          },
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <Card
      ref={rootRef}
      className="relative h-40 w-full max-w-[404px] flex-row gap-0 overflow-hidden rounded-lg border-primary/30 py-0 shadow-xs sm:w-[404px]"
    >
      <div className="relative h-full w-40 shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div
          ref={sweepRef}
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 55%, transparent 70%)",
            backgroundSize: "200% 100%",
            backgroundPositionX: "-100%",
          }}
        />
        <div
          ref={orb1Ref}
          className="absolute -left-4 top-6 h-16 w-16 rounded-full bg-fuchsia-500/40 blur-2xl"
        />
        <div
          ref={orb2Ref}
          className="absolute right-2 top-2 h-14 w-14 rounded-full bg-cyan-400/40 blur-2xl"
        />
        <div
          ref={orb3Ref}
          className="absolute bottom-0 left-10 h-16 w-16 rounded-full bg-indigo-500/40 blur-2xl"
        />

        <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-white shadow-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {formatElapsed(elapsed)}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div ref={ringRef} className="relative h-14 w-14">
            <span className="absolute inset-0 rounded-full border-2 border-white/10" />
            <span
              className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: "rgba(255,255,255,0.85)",
                borderRightColor: "rgba(255,255,255,0.35)",
              }}
            />
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Generating
          <span ref={dotsRef} className="inline-flex gap-0.5">
            <i className="inline-block h-1 w-1 rounded-full bg-primary opacity-40" />
            <i className="inline-block h-1 w-1 rounded-full bg-primary opacity-40" />
            <i className="inline-block h-1 w-1 rounded-full bg-primary opacity-40" />
          </span>
        </div>

        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-foreground/90">
          {request.prompt}
        </p>

        <div ref={barsRef} className="mt-auto flex flex-col gap-1.5 pb-1">
          <i className="block h-1.5 w-3/4 rounded-full bg-gradient-to-r from-primary/60 to-primary/10" />
          <i className="block h-1.5 w-1/2 rounded-full bg-gradient-to-r from-primary/50 to-primary/10" />
          <i className="block h-1.5 w-2/3 rounded-full bg-gradient-to-r from-primary/40 to-primary/10" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{request.size}</span>
          <span>{request.quality}</span>
          <span>{request.format}</span>
          <span>×{request.n}</span>
        </div>
      </div>
    </Card>
  );
}
