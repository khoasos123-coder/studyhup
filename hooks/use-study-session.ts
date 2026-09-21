'use client';

import * as React from 'react';
import { randInt } from '@/lib/utils';

export type SessionStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type PauseReason = 'MANUAL' | 'ABSENT' | 'POMODORO_TIMEOUT' | 'DAILY_LIMIT';

export type StudySessionEvent =
  | { type: 'START'; at: Date }
  | { type: 'PAUSE'; at: Date; reason: PauseReason }
  | { type: 'RESUME'; at: Date }
  | { type: 'CHECKIN'; at: Date }
  | { type: 'END'; at: Date; durationSeconds: number; validSeconds: number; reason?: PauseReason };

export interface UseStudySessionOptions {
  /** Số giây đã học hợp lệ trong ngày (server trả về lúc mount) */
  secondsStudiedToday?: number;
  /** Trần 12h/ngày */
  dailyLimitHours?: number;
  /** Pomodoro check-in: random trong khoảng này */
  pomodoroMinMinutes?: number;
  pomodoroMaxMinutes?: number;
  /** Snapshot: random trong khoảng này */
  snapshotMinMinutes?: number;
  snapshotMaxMinutes?: number;
  /** Vắng mặt liên tục bao lâu thì auto PAUSE */
  absentGraceSeconds?: number;
  /** Lấy 1 frame thumbnail từ useMediaCapture */
  captureFrame?: () => Promise<Blob | null>;
  /** Kiểm tra hiện diện (AI) */
  checkPresence?: () => Promise<boolean>;
  /** Lưu snapshot lên server */
  onSnapshot?: (
    blob: Blob,
    meta: { capturedAt: Date; presenceVerified: boolean },
  ) => void | Promise<void>;
  /** Đồng bộ vòng đời phiên lên server */
  onSessionEvent?: (event: StudySessionEvent) => void | Promise<void>;
}

export function useStudySession(options: UseStudySessionOptions = {}) {
  const {
    secondsStudiedToday = 0,
    dailyLimitHours = 12,
    pomodoroMinMinutes = 30,
    pomodoroMaxMinutes = 50,
    snapshotMinMinutes = 3,
    snapshotMaxMinutes = 5,
    absentGraceSeconds = 300, // 5 phút
    captureFrame,
    checkPresence,
    onSnapshot,
    onSessionEvent,
  } = options;

  const dailyLimitSeconds = dailyLimitHours * 3600;

  const [status, setStatus] = React.useState<SessionStatus>('IDLE');
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [pauseReason, setPauseReason] = React.useState<PauseReason | null>(null);
  const [snapshotCount, setSnapshotCount] = React.useState(0);
  const [isPresent, setIsPresent] = React.useState(true);
  const [absentSeconds, setAbsentSeconds] = React.useState(0);
  const [secondsToCheckIn, setSecondsToCheckIn] = React.useState(0);
  const [startedAt, setStartedAt] = React.useState<Date | null>(null);
  const [snapshotNonce, setSnapshotNonce] = React.useState(0);

  // 1. Khôi phục mốc thời gian khi lỡ F5 hoặc tải lại trang
  React.useEffect(() => {
    const savedStartTime = localStorage.getItem('study_start_timestamp');
    if (savedStartTime) {
      const startMs = parseInt(savedStartTime, 10);
      const secondsPassed = Math.floor((Date.now() - startMs) / 1000);
      setElapsedSeconds(secondsPassed);
      setStartedAt(new Date(startMs));
      setStatus('RUNNING');
    }
  }, []);

  const statusRef = React.useRef<SessionStatus>(status);
  statusRef.current = status;

  const elapsedRef = React.useRef(0);
  elapsedRef.current = elapsedSeconds;

  const presenceRef = React.useRef(true);
  const endedRef = React.useRef(false);

  const validSecondsToday = secondsStudiedToday + elapsedSeconds;
  const dailyProgress = Math.min(100, (validSecondsToday / dailyLimitSeconds) * 100);
  const remainingTodaySeconds = Math.max(0, dailyLimitSeconds - validSecondsToday);

  const scheduleCheckIn = React.useCallback(() => {
    setSecondsToCheckIn(randInt(pomodoroMinMinutes * 60, pomodoroMaxMinutes * 60));
  }, [pomodoroMinMinutes, pomodoroMaxMinutes]);

  // ---------- Ticker 1s ----------
  React.useEffect(() => {
    if (status !== 'RUNNING') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
      setSecondsToCheckIn((s) => (s > 0 ? s - 1 : 0));
      setAbsentSeconds((s) => (presenceRef.current ? 0 : s + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // ---------- ACTIONS (khai báo trước để effect dùng được) ----------
  const pause = React.useCallback(
    async (reason: PauseReason = 'MANUAL') => {
      if (statusRef.current !== 'RUNNING') return;
      setStatus('PAUSED');
      setPauseReason(reason);
      await onSessionEvent?.({ type: 'PAUSE', at: new Date(), reason });
    },
    [onSessionEvent],
  );

  const end = React.useCallback(
    async (reason?: PauseReason) => {
      // Xóa mốc thời gian lưu tạm khi phiên học kết thúc
      localStorage.removeItem('study_start_timestamp');

      if (endedRef.current) return;
      endedRef.current = true;
      setStatus('COMPLETED');
      setPauseReason(reason ?? null);
      await onSessionEvent?.({
        type: 'END',
        at: new Date(),
        durationSeconds: elapsedRef.current,
        validSeconds: elapsedRef.current,
        reason,
      });
    },
    [onSessionEvent],
  );

  // ---------- Trần 12h/ngày ----------
  React.useEffect(() => {
    if (status !== 'RUNNING') return;
    if (validSecondsToday >= dailyLimitSeconds) {
      void end('DAILY_LIMIT');
    }
  }, [status, validSecondsToday, dailyLimitSeconds, end]);

  // ---------- Pomodoro check-in ----------
  React.useEffect(() => {
    if (status === 'RUNNING' && secondsToCheckIn === 0 && elapsedRef.current > 0) {
      void pause('POMODORO_TIMEOUT');
    }
  }, [secondsToCheckIn, status, pause]);

  // ---------- AI Presence polling ----------
  React.useEffect(() => {
    if (status !== 'RUNNING' || !checkPresence) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const present = await checkPresence();
        if (cancelled) return;
        presenceRef.current = present;
        setIsPresent(present);
      } catch {
        // Lỗi mạng/model -> fail-open, không phạt user
        presenceRef.current = true;
      }
    }, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [status, checkPresence]);

  // ---------- Vắng mặt > 5 phút -> PAUSE ----------
  React.useEffect(() => {
    if (status === 'RUNNING' && absentSeconds >= absentGraceSeconds) {
      void pause('ABSENT');
    }
  }, [absentSeconds, status, absentGraceSeconds, pause]);

  // ---------- Snapshot scheduler (random 3–5 phút) ----------
  React.useEffect(() => {
    if (status !== 'RUNNING' || !captureFrame) return;
    const delayMs = randInt(snapshotMinMinutes * 60, snapshotMaxMinutes * 60) * 1000;

    const id = window.setTimeout(async () => {
      if (statusRef.current !== 'RUNNING') return;
      try {
        const blob = await captureFrame();
        if (!blob) return;
        const present = presenceRef.current;
        await onSnapshot?.(blob, { capturedAt: new Date(), presenceVerified: present });
        setSnapshotCount((c) => c + 1);
      } finally {
        setSnapshotNonce((n) => n + 1); // lên lịch lần chụp kế tiếp
      }
    }, delayMs);

    return () => window.clearTimeout(id);
  }, [status, snapshotNonce, captureFrame, onSnapshot, snapshotMinMinutes, snapshotMaxMinutes]);

  // ---------- Public actions ----------
  const start = React.useCallback(async () => {
    // Lưu mốc thời điểm bắt đầu vào localStorage
    localStorage.setItem('study_start_timestamp', Date.now().toString());

    endedRef.current = false;
    setElapsedSeconds(0);
    setStartedAt(new Date());
    setSnapshotCount(0);
    setAbsentSeconds(0);
    presenceRef.current = true;
    setIsPresent(true);
    setPauseReason(null);
    scheduleCheckIn();
    setSnapshotNonce((n) => n + 1);
    setStatus('RUNNING');
    await onSessionEvent?.({ type: 'START', at: new Date() });
  }, [onSessionEvent, scheduleCheckIn]);

  const resume = React.useCallback(async () => {
    if (statusRef.current !== 'PAUSED') return;
    setPauseReason(null);
    setAbsentSeconds(0);
    presenceRef.current = true;
    setIsPresent(true);
    scheduleCheckIn();
    setStatus('RUNNING');
    await onSessionEvent?.({ type: 'RESUME', at: new Date() });
  }, [onSessionEvent, scheduleCheckIn]);

  /** Xác nhận còn hoạt động sau Pomodoro */
  const confirmCheckIn = React.useCallback(async () => {
    await onSessionEvent?.({ type: 'CHECKIN', at: new Date() });
    await resume();
  }, [onSessionEvent, resume]);

  const reset = React.useCallback(() => {
    // Xóa mốc thời gian khi reset phiên
    localStorage.removeItem('study_start_timestamp');

    endedRef.current = false;
    setStatus('IDLE');
    setElapsedSeconds(0);
    setPauseReason(null);
    setSnapshotCount(0);
    setAbsentSeconds(0);
    setSecondsToCheckIn(0);
    setStartedAt(null);
  }, []);

  return {
    // state
    status,
    elapsedSeconds,
    startedAt,
    pauseReason,
    isPresent,
    absentSeconds,
    snapshotCount,
    secondsToCheckIn,
    // derived
    validSecondsToday,
    remainingTodaySeconds,
    dailyProgress,
    isDailyLimitReached: validSecondsToday >= dailyLimitSeconds,
    requiresCheckIn: status === 'PAUSED' && pauseReason === 'POMODORO_TIMEOUT',
    // actions
    start,
    pause,
    resume,
    end,
    reset,
    confirmCheckIn,
  };
}