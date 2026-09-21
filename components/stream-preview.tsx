'use client';

import * as React from 'react';
import { Camera, MonitorUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StreamPreview({
  setVideoElement,
  mode,
  className,
}: {
  setVideoElement: (el: HTMLVideoElement | null) => void;
  mode: 'WEBCAM' | 'SCREEN' | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-xl border bg-black',
        className,
      )}
    >
      <video
        ref={setVideoElement}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      {!mode && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Camera className="h-8 w-8" />
          <p className="text-sm">Chưa có nguồn video</p>
        </div>
      )}

      {mode && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur">
          {mode === 'WEBCAM' ? (
            <Camera className="h-3.5 w-3.5" />
          ) : (
            <MonitorUp className="h-3.5 w-3.5" />
          )}
          {mode === 'WEBCAM' ? 'Webcam' : 'Chia sẻ màn hình'}
        </div>
      )}
    </div>
  );
}