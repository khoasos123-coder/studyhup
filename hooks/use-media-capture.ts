'use client';

import * as React from 'react';

export type CaptureMode = 'WEBCAM' | 'SCREEN';
export type CaptureStatus = 'IDLE' | 'REQUESTING' | 'READY' | 'ERROR';

export function useMediaCapture() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [mode, setMode] = React.useState<CaptureMode | null>(null);
  const [status, setStatus] = React.useState<CaptureStatus>('IDLE');
  const [error, setError] = React.useState<string | null>(null);

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setMode(null);
    setStatus('IDLE');
    setError(null);
  }, []);

  /** Callback ref — gắn được cả khi <video> mount sau khi stream đã có */
  const setVideoElement = React.useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => {});
    }
  }, []);

  const start = React.useCallback(
    async (next: CaptureMode): Promise<boolean> => {
      stop();
      setStatus('REQUESTING');
      setError(null);

      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
          throw new Error('Trình duyệt không hỗ trợ MediaDevices API.');
        }

        const stream =
          next === 'WEBCAM'
            ? await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false,
              })
            : await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 5, max: 10 } },
                audio: false,
              });

        streamRef.current = stream;

        // User bấm "Stop sharing" trên thanh của browser
        stream.getVideoTracks()[0]?.addEventListener('ended', () => stop());

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setMode(next);
        setStatus('READY');
        return true;
      } catch (e) {
        const msg =
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Bạn đã từ chối quyền truy cập. Hãy cấp quyền để bắt đầu tính giờ.'
            : e instanceof Error
              ? e.message
              : 'Không thể truy cập nguồn video.';
        setError(msg);
        setStatus('ERROR');
        return false;
      }
    },
    [stop],
  );

  /** Chụp 1 thumbnail JPEG độ phân giải thấp */
  const captureFrame = React.useCallback(
    async (opts?: { maxWidth?: number; quality?: number }): Promise<Blob | null> => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return null;

      const maxWidth = opts?.maxWidth ?? 480;
      const scale = Math.min(1, maxWidth / video.videoWidth);

      const c = document.createElement('canvas');
      c.width = Math.round(video.videoWidth * scale);
      c.height = Math.round(video.videoHeight * scale);

      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, c.width, c.height);

      return new Promise((resolve) =>
        c.toBlob((b) => resolve(b), 'image/jpeg', opts?.quality ?? 0.6),
      );
    },
    [],
  );

  React.useEffect(() => () => stop(), [stop]);

  return {
    videoRef,
    setVideoElement,
    streamRef,
    mode,
    status,
    error,
    isReady: status === 'READY',
    start,
    stop,
    captureFrame,
  };
}