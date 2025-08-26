import React from "react";
import Image from "next/image";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="min-h-[50vh] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <Image
            src="/loading.gif"
            alt="Loading problems"
            width={120}
            height={120}
            priority
            unoptimized
          />
          <div className="text-sm">Loading problems…</div>
        </div>
      </div>
    </div>
  );
}
