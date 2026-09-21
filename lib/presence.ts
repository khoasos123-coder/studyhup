/**
 * AI Presence — điểm tích hợp.
 * Hiện tại: progressive enhancement
 *   1. Nếu browser hỗ trợ `FaceDetector` (Chrome) -> dùng luôn.
 *   2. Fallback: heuristic frame-difference (phát hiện chuyển động).
 *   3. Fallback cuối: coi như có mặt (fail-open, tránh phạt oan user).
 *
 * TODO(prod): thay bằng MediaPipe Face Detection / TFJS BlazeFace
 * hoặc gọi `/api/ai/presence` để chạy model server-side.
 */

export interface PresenceResult {
  present: boolean;
  confidence: number;
  source: 'face-detector' | 'motion' | 'fallback';
}

const SAMPLE_W = 64;
const SAMPLE_H = 48;
const MOTION_THRESHOLD = 0.012;

let prevFrame: Float32Array | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function getCtx() {
  if (typeof document === 'undefined') return null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  return ctx;
}

function motionScore(video: HTMLVideoElement): number | null {
  const c = getCtx();
  if (!c) return null;
  if (!video.videoWidth || video.readyState < 2) return null;

  c.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
  const { data } = c.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

  const gray = new Float32Array(SAMPLE_W * SAMPLE_H);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    gray[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  }

  if (!prevFrame) {
    prevFrame = gray;
    return null; // frame đầu chưa so sánh được
  }

  let diff = 0;
  for (let i = 0; i < gray.length; i += 1) diff += Math.abs(gray[i] - prevFrame[i]);
  prevFrame = gray;
  return diff / gray.length;
}

type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

declare global {
  interface Window {
    FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
  }
}

let faceDetector: FaceDetectorLike | null | undefined;

export async function detectPresence(video: HTMLVideoElement): Promise<PresenceResult> {
  if (!video || video.readyState < 2) {
    return { present: true, confidence: 0, source: 'fallback' };
  }

  // 1) Native FaceDetector
  if (typeof window !== 'undefined' && window.FaceDetector) {
    try {
      if (faceDetector === undefined) {
        faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      }
      if (faceDetector) {
        const faces = await faceDetector.detect(video);
        return {
          present: faces.length > 0,
          confidence: faces.length > 0 ? 0.95 : 0.1,
          source: 'face-detector',
        };
      }
    } catch {
      faceDetector = null; // tắt hẳn nếu lỗi
    }
  }

  // 2) Motion heuristic
  const score = motionScore(video);
  if (score === null) {
    return { present: true, confidence: 0.5, source: 'motion' };
  }
  return {
    present: score > MOTION_THRESHOLD,
    confidence: Math.min(1, score / MOTION_THRESHOLD) * 0.6,
    source: 'motion',
  };
}

export function resetPresenceBuffer() {
  prevFrame = null;
}