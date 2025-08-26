import React from "react";
import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-300">
        <Image
          src="/loading.gif"
          alt="Loading problem"
          width={120}
          height={120}
          priority
          unoptimized
        />
        <div className="text-sm">Loading problem…</div>
      </div>
    </div>
  );
}
