'use client';

import { FloatingMessenger } from '@/components/chat/floating-messenger';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useMediaCapture, CaptureMode } from '@/hooks/use-media-capture';
import { useStudySession, StudySessionEvent } from '@/hooks/use-study-session';
import { LivePeersModal } from '@/components/study/live-peers-modal';

/* =========================================================
   CẤU HÌNH BẬC RANK & HỆ THỐNG HUY HIỆU LỤC GIÁC
   ========================================================= */
interface TierConfig {
  id: string;
  name: string;
  icon: string;
  c: string;       // Màu chính
  ink: string;     // Màu chữ viền
  from: number | null;
  size: number | null;
  div: boolean;
}

const TIERS: TierConfig[] = [
  { id: 'BRONZE', name: 'Đồng', icon: 'shield', c: '#CD7F32', ink: '#8A4B14', from: 0, size: 2.5, div: true },
  { id: 'SILVER', name: 'Bạc', icon: 'medal', c: '#B4BFD0', ink: '#5F6B80', from: 10, size: 10, div: true },
  { id: 'GOLD', name: 'Vàng', icon: 'award', c: '#F2B81C', ink: '#8F6300', from: 50, size: 12.5, div: true },
  { id: 'PLATINUM', name: 'Bạch Kim', icon: 'star', c: '#3CC4B5', ink: '#0F7F73', from: 100, size: 25, div: true },
  { id: 'DIAMOND', name: 'Kim Cương', icon: 'gem', c: '#4C9BFF', ink: '#1B5FC7', from: 200, size: 25, div: true },
  { id: 'ELITE', name: 'Tinh Anh', icon: 'sparkles', c: '#9A7BFF', ink: '#5B34D6', from: 300, size: 25, div: true },
  { id: 'MASTER', name: 'Cao Thủ', icon: 'crown', c: '#F0567A', ink: '#B01F47', from: 400, size: 50, div: true },
  { id: 'WAR_GOD', name: 'Chiến Thần', icon: 'swords', c: '#FF7A2F', ink: '#B84A0A', from: 1000, size: null, div: false },
  { id: 'CHALLENGER', name: 'Thách Đấu', icon: 'trophy', c: '#FFC933', ink: '#0E8AA8', from: null, size: null, div: false },
];

const TB: Record<string, TierConfig> = {};
TIERS.forEach((t) => { TB[t.id] = t; });
const ROMAN: Record<number, string> = { 4: 'IV', 3: 'III', 2: 'II', 1: 'I' };

interface StepItem {
  tier: string;
  div: number | null;
  min: number;
}
const STEPS: StepItem[] = [];
TIERS.forEach((t) => {
  if (t.id === 'CHALLENGER') return;
  if (t.div && t.from !== null && t.size !== null) {
    [4, 3, 2, 1].forEach((d, i) => {
      STEPS.push({ tier: t.id, div: d, min: t.from! + i * t.size! });
    });
  } else if (t.from !== null) {
    STEPS.push({ tier: t.id, div: null, min: t.from });
  }
});

function stepLabel(s: StepItem) {
  const t = TB[s.tier];
  return s.div ? `${t.name} ${ROMAN[s.div]}` : t.name;
}

function calculateRankData(hours: number, isChallengerTop50: boolean = false) {
  const h = Math.max(0, hours || 0);
  if (isChallengerTop50) {
    return {
      tier: 'CHALLENGER',
      div: null,
      label: 'Thách Đấu',
      hours: h,
      pct: 100,
      toNext: 0,
      nextLabel: null,
      ceil: null,
    };
  }
  let i = STEPS.length - 1;
  while (i > 0 && h + 1e-6 < STEPS[i].min) i--;
  const s = STEPS[i];
  const n = STEPS[i + 1];
  const ceil = n ? n.min : 1500;
  const nextLabel = n ? stepLabel(n) : 'Thách Đấu (Top 50)';
  const pct = Math.min(100, Math.max(0, ((h - s.min) / (ceil - s.min)) * 100));
  return {
    tier: s.tier,
    div: s.div,
    label: stepLabel(s),
    hours: h,
    pct: Math.floor(pct * 10) / 10,
    toNext: Math.max(0, ceil - h),
    nextLabel,
    ceil,
  };
}

/* =========================================================
   BỘ VẼ ICON NGUYÊN BẢN LUCIDE SVG
   ========================================================= */
const ICONS: Record<string, React.ReactNode> = {
  play: <polygon points="6 3 20 12 6 21 6 3" />,
  pause: <><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></>,
  square: <rect width="18" height="18" x="3" y="3" rx="2" />,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  video: <><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></>,
  monitor: <><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  languages: <><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></>,
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  'shield-check': <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  medal: <><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" /><path d="M11 12 5.12 2.2" /><path d="m13 12 5.88-9.8" /><path d="M8 7h8" /><circle cx="12" cy="17" r="5" /><path d="M12 18v-2h-.5" /></>,
  award: <><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" /><circle cx="12" cy="8" r="6" /></>,
  star: <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />,
  gem: <><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></>,
  sparkles: <><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" /></>,
  crown: <><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></>,
  swords: <><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" x2="19" y1="19" y2="13" /><line x1="16" x2="20" y1="16" y2="20" /><line x1="19" x2="21" y1="21" y2="19" /><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" /><line x1="5" x2="9" y1="14" y2="18" /><line x1="7" x2="4" y1="17" y2="20" /><line x1="3" x2="5" y1="19" y2="21" /></>,
  eye: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>,
  timer: <><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" /></>,
  dashed: <circle cx="12" cy="12" r="9" strokeDasharray="3.2 3.2" />
};

function SvgIcon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      className={`inline-block flex-shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] || ICONS.clock}
    </svg>
  );
}

// Component Huy hiệu Lục giác SVG
function HexEmblem({ tierId, div, size = 64, className = '' }: { tierId: string; div?: number | null; size?: number; className?: string }) {
  const t = TB[tierId] || TB.BRONZE;
  return (
    <div
      className={`relative inline-grid place-items-center flex-none select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        // @ts-ignore
        '--c': t.c,
        '--ink': t.ink,
      }}
    >
      <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
        <polygon
          points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5"
          fill="color-mix(in srgb, var(--c) 22%, transparent)"
          stroke={tierId === 'CHALLENGER' ? 'url(#gChal)' : 'var(--c)'}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <polygon
          points="50,14 81,32 81,68 50,86 19,68 19,32"
          fill="none"
          stroke="var(--c)"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      </svg>
      <span className="relative" style={{ color: t.c }}>
        <SvgIcon name={t.icon} size={Math.round(size * 0.42)} />
      </span>
      {div && size >= 50 && (
        <b
          className="absolute left-1/2 -bottom-1 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#111A2E] border text-white font-bold leading-none shadow"
          style={{ borderColor: t.c, color: t.c, fontSize: `${Math.round(size * 0.16)}px` }}
        >
          {ROMAN[div]}
        </b>
      )}
    </div>
  );
}

/* =========================================================
   INTERFACES & PROPS
   ========================================================= */
interface UserProps {
  id: string;
  username: string;
  displayName: string;
  totalHours: number;
  secondsStudiedToday: number;
  avatarUrl?: string | null;
  isStudent?: boolean;
}

interface HistoryItem {
  id: string;
  subjectTag: string | null;
  startTime: string;
  durationMinutes: number | null;
  status: string;
  verifyMode: string;
}

interface LeaderboardUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  currentRank: string;
  totalHours: number;
  weeklyHours: number;
  streakCount: number;
}

const SUBJECTS_CONFIG: Record<string, string> = {
  'Lập trình': 'code',
  'Tiếng Anh': 'languages',
  'An toàn thông tin': 'shield',
};

export function FocusStudyDashboard({ user: initialUser }: { user: UserProps }) {
  const router = useRouter();
  const media = useMediaCapture();
  const [currentUser, setCurrentUser] = React.useState<UserProps>(initialUser);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [selectedMode, setSelectedMode] = React.useState<CaptureMode>('SCREEN');
  const [currentSubject, setCurrentSubject] = React.useState<string>('Lập trình');
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(true);

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = React.useState(false);
  const [isLivePeersOpen, setIsLivePeersOpen] = React.useState(false);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardUser[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = React.useState(false);

  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [editDisplayName, setEditDisplayName] = React.useState(currentUser.displayName);
  const [editAvatarUrl, setEditAvatarUrl] = React.useState(currentUser.avatarUrl || '');
  const [editIsStudent, setEditIsStudent] = React.useState(currentUser.isStudent ?? true);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Lịch sử
  const loadHistory = React.useCallback(async () => {
    try {
      const res = await fetch('/api/study-sessions');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Không tải được lịch sử:', e);
    }
  }, []);

  // Load Leaderboard
  const loadLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Lỗi tải BXH:', e);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  React.useEffect(() => {
    loadHistory();
    const savedSessionId = localStorage.getItem('study_session_id');
    if (savedSessionId) setSessionId(savedSessionId);
    const savedMode = localStorage.getItem('study_capture_mode') as CaptureMode | null;
    if (savedMode) setSelectedMode(savedMode);
  }, [loadHistory]);

  const handleSessionEvent = React.useCallback(
    async (event: StudySessionEvent) => {
      if (event.type === 'START') {
        try {
          const res = await fetch('/api/study-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              verifyMode: selectedMode === 'SCREEN' ? 'SCREEN_SHARE' : 'WEBCAM',
              subjectTag: currentSubject,
            }),
          });
          const data = await res.json();
          if (data.id) {
            setSessionId(data.id);
            localStorage.setItem('study_session_id', data.id);
            localStorage.setItem('study_capture_mode', selectedMode);
            loadHistory();
          }
        } catch (err) {
          console.error('Không thể tạo phiên học:', err);
        }
        return;
      }

      const activeSessionId = sessionId || localStorage.getItem('study_session_id');
      if (!activeSessionId) return;

      try {
        const res = await fetch(`/api/study-sessions/${activeSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
        if (res.ok && event.type === 'END') {
          const resData = await res.json();
          if (resData.user) {
            setCurrentUser((prev) => ({
              ...prev,
              totalHours: resData.user.totalHours,
              secondsStudiedToday: (prev.secondsStudiedToday || 0) + (resData.user.secondsStudiedToday || 0),
            }));
          }
          loadHistory();
          router.refresh();
        }
      } catch (err) {
        console.error('Lỗi cập nhật phiên:', err);
      }
    },
    [selectedMode, currentSubject, sessionId, loadHistory, router]
  );

  const handleSnapshot = React.useCallback(
    async (blob: Blob, meta: { capturedAt: Date; presenceVerified: boolean }) => {
      const activeSessionId = sessionId || localStorage.getItem('study_session_id');
      if (!activeSessionId) return;
      try {
        const formData = new FormData();
        formData.append('file', blob, 'snapshot.jpg');
        formData.append('capturedAt', meta.capturedAt.toISOString());
        formData.append('presenceVerified', String(meta.presenceVerified));

        await fetch(`/api/study-sessions/${activeSessionId}/snapshots`, {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.error('Lỗi tải snapshot:', err);
      }
    },
    [sessionId]
  );

  const session = useStudySession({
    secondsStudiedToday: currentUser.secondsStudiedToday,
    captureFrame: media.captureFrame,
    onSessionEvent: handleSessionEvent,
    onSnapshot: handleSnapshot,
  });

  const handleStartSession = async () => {
    const ok = await media.start(selectedMode);
    if (ok) await session.start();
  };

  const handleStopSession = async () => {
    await session.end();
    media.stop();
    localStorage.removeItem('study_session_id');
    localStorage.removeItem('study_start_timestamp');
    localStorage.removeItem('study_capture_mode');
    setSessionId(null);
  };

  const handleNewSession = () => {
    session.reset();
    media.stop();
    setSessionId(null);
    localStorage.removeItem('study_session_id');
    localStorage.removeItem('study_start_timestamp');
    localStorage.removeItem('study_capture_mode');
  };

  const handleLogout = async () => {
    media.stop();
    localStorage.clear();
    await signOut({ callbackUrl: '/login' });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editDisplayName,
          avatarUrl: editAvatarUrl || null,
          isStudent: editIsStudent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');
      setCurrentUser((prev) => ({
        ...prev,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        isStudent: data.isStudent,
      }));
      setProfileMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
      setTimeout(() => {
        setIsProfileOpen(false);
        setProfileMsg(null);
      }, 1200);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Có lỗi xảy ra' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Tính toán Rank hiện tại
  const liveTotalHours = currentUser.totalHours + (session.status === 'RUNNING' ? session.elapsedSeconds / 3600 : 0);
  const rankInfo = calculateRankData(liveTotalHours);
  const currentTierConfig = TB[rankInfo.tier] || TB.BRONZE;

  // Trần 12h hôm nay
  const todayHours = (currentUser.secondsStudiedToday + session.elapsedSeconds) / 3600;
  const capRatio = Math.min(1, todayHours / 12);
  const ringOffset = 263.89 * (1 - capRatio);

  // Định dạng đồng hồ
  const pad = (n: number) => String(n).padStart(2, '0');
  const clockH = pad(Math.floor(session.elapsedSeconds / 3600));
  const clockM = pad(Math.floor((session.elapsedSeconds % 3600) / 60));
  const clockS = pad(session.elapsedSeconds % 60);

  // Phân nhóm lịch sử
  const groupHistoryByDate = () => {
    const groups: Record<string, HistoryItem[]> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    history.forEach((item) => {
      const itemDate = new Date(item.startTime).toDateString();
      let label = itemDate;
      if (itemDate === today) label = 'Hôm nay';
      else if (itemDate === yesterday) label = 'Hôm qua';
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  };
  const groupedHistory = groupHistoryByDate();

  return (
    <div
      className="flex h-screen bg-[#0A0F1C] text-[#EAF0FB] overflow-hidden font-sans antialiased"
      style={{
        // @ts-ignore
        '--rank': currentTierConfig.c,
        '--rank-ink': currentTierConfig.ink,
      }}
    >
      {/* SVG Gradient chung cho Thách Đấu */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="gChal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFC933" />
            <stop offset="100%" stopColor="#2CC7E8" />
          </linearGradient>
        </defs>
      </svg>

      {/* ===================== SIDEBAR ===================== */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 flex-shrink-0 bg-[#080C17] border-r border-[#96AFEB]/15 flex flex-col justify-between overflow-hidden z-20`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Brand */}
          <div className="p-4 border-b border-[#96AFEB]/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
              <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
                <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M16 10v6l4 2.5" fill="none" stroke="var(--rank)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>StudyHup</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-[#8390AF] hover:text-white md:hidden">✕</button>
          </div>

          {/* Navigation & Phiên mới */}
          <div className="p-3 space-y-2">
            <button
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#111A2E] hover:bg-[#172137] border border-[#96AFEB]/20 rounded-xl text-xs font-semibold text-white transition shadow-sm"
            >
              <SvgIcon name="plus" size={16} />
              <span>Phiên học mới</span>
            </button>

            <nav className="space-y-1">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#111A2E] text-white border-l-2 border-[var(--rank)] shadow-sm">
                <SvgIcon name="clock" size={16} />
                <span>Phòng tập trung</span>
              </button>
              <button
                onClick={() => {
                  loadLeaderboard();
                  setIsLeaderboardOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#A8B3CF] hover:text-white hover:bg-[#111A2E] transition"
              >
                <div className="flex items-center gap-2.5">
                  <SvgIcon name="trophy" size={16} />
                  <span>Bảng xếp hạng</span>
                </div>
                <span className="text-[10px] bg-[#172137] px-2 py-0.5 rounded-full border border-[#96AFEB]/20 text-[#8390AF]">Top 50</span>
              </button>
              <button
                onClick={() => {
                  setEditDisplayName(currentUser.displayName);
                  setEditAvatarUrl(currentUser.avatarUrl || '');
                  setEditIsStudent(currentUser.isStudent ?? true);
                  setIsProfileOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A8B3CF] hover:text-white hover:bg-[#111A2E] transition"
              >
                <SvgIcon name="user" size={16} />
                <span>Hồ sơ cá nhân</span>
              </button>
            </nav>
          </div>

          {/* Lịch sử phiên học */}
          <div className="flex-1 overflow-y-auto px-3 space-y-4 text-xs scrollbar-thin scrollbar-thumb-neutral-800">
            <div className="px-1 font-semibold text-[#8390AF] text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Lịch sử học tập</span>
              <span className="text-[10px]">{history.length} phiên</span>
            </div>

            {Object.keys(groupedHistory).length === 0 ? (
              <p className="px-1 text-[#8390AF] text-xs italic">Chưa có phiên học nào.</p>
            ) : (
              Object.entries(groupedHistory).map(([dateLabel, items]) => (
                <div key={dateLabel} className="space-y-1">
                  <div className="px-1 text-[11px] font-semibold text-[#8390AF]">{dateLabel}</div>
                  {items.map((item) => {
                    const timeStr = new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const durStr = (item.durationMinutes || 0) < 1 ? '<1p' : `${item.durationMinutes}p`;
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#111A2E] text-[#A8B3CF] hover:text-white transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-7 h-7 rounded-lg bg-[#111A2E] border border-[#96AFEB]/15 flex items-center justify-center flex-shrink-0">
                            <SvgIcon name={SUBJECTS_CONFIG[item.subjectTag || ''] || 'code'} size={14} />
                          </span>
                          <span className="truncate font-medium text-xs">{item.subjectTag || 'Học tập'}</span>
                        </div>
                        <span className="text-[11px] text-[#8390AF] font-mono ml-2 flex-shrink-0">
                          {durStr} • {timeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Profile Card ở đáy Sidebar */}
          <div className="p-3 border-t border-[#96AFEB]/15 bg-[#080C17] flex items-center justify-between">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 truncate hover:opacity-85 transition text-left"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt="avatar"
                  className="w-9 h-9 rounded-full object-cover border-2 flex-shrink-0"
                  style={{ borderColor: currentTierConfig.c }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full bg-[#111A2E] border-2 flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                  style={{ borderColor: currentTierConfig.c }}
                >
                  {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate leading-tight">{currentUser.displayName}</p>
                <p className="text-[11px] text-[#8390AF] truncate leading-tight">@{currentUser.username}</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-[#8390AF] hover:text-rose-400 hover:bg-[#111A2E] rounded-lg transition"
              title="Đăng xuất"
            >
              <SvgIcon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===================== KHU VỰC CHÍNH ===================== */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0A0F1C]">
        {/* Header trên cùng - Nền đen đặc, z-index 40 để che phủ sạch sẽ khi cuộn */}
        <header className="h-16 border-b border-[#96AFEB]/15 px-6 flex items-center justify-between flex-shrink-0 bg-[#0A0F1C] sticky top-0 z-40 shadow-lg">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-[#8390AF] hover:text-white rounded-lg bg-[#111A2E] border border-[#96AFEB]/15 transition"
              >
                ☰
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Phòng tập trung</h1>
              <p className="text-xs text-[#8390AF]">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Nút xem học viên trực tuyến */}
            <button
              type="button"
              onClick={() => setIsLivePeersOpen(true)}
              className="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Phòng Học Trực Tuyến</span>
            </button>

            {/* Nút Bảng Xếp Hạng */}
            <button
              onClick={() => {
                loadLeaderboard();
                setIsLeaderboardOpen(true);
              }}
              className="px-3 py-1.5 bg-[#111A2E] hover:bg-[#172137] border border-[#96AFEB]/20 text-[#A8B3CF] hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-2"
            >
              <SvgIcon name="trophy" size={14} className="text-amber-400" />
              <span>Bảng Xếp Hạng</span>
            </button>
          </div>
        </header>

        {/* Nội dung 2 cột */}
        <div className="p-4 md:p-8 max-w-[1360px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          {/* CỘT TRÁI: SÂN KHẤU (STAGE) */}
          <section className="relative overflow-hidden bg-[#111A2E] border border-[#96AFEB]/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            {/* Lưới nền tinh tế */}
            <div
              className="absolute inset-0 h-80 pointer-events-none opacity-25"
              style={{
                backgroundImage: 'linear-gradient(rgba(140,170,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(140,170,255,0.15) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                maskImage: 'linear-gradient(to bottom, black 25%, transparent)',
              }}
            />

            {/* Stage-top: Trạng thái & Chọn môn học */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#172137] border border-[#96AFEB]/20 text-xs font-semibold text-[#A8B3CF]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    session.status === 'RUNNING'
                      ? 'bg-rose-500 shadow-[0_0_0_4px_rgba(255,107,107,0.25)] animate-pulse'
                      : session.status === 'PAUSED'
                      ? 'bg-amber-400'
                      : session.status === 'COMPLETED'
                      ? 'bg-emerald-400'
                      : 'bg-[#8390AF]'
                  }`}
                />
                <span>
                  {session.status === 'RUNNING' && 'Đang học'}
                  {session.status === 'PAUSED' && 'Tạm dừng'}
                  {session.status === 'COMPLETED' && 'Đã kết thúc'}
                  {session.status === 'IDLE' && 'Sẵn sàng'}
                </span>
              </span>

              {/* Môn học Chips */}
              <div className="flex flex-wrap gap-2">
                {Object.keys(SUBJECTS_CONFIG).map((subjName) => {
                  const active = currentSubject === subjName;
                  return (
                    <button
                      key={subjName}
                      type="button"
                      disabled={session.status !== 'IDLE'}
                      onClick={() => setCurrentSubject(subjName)}
                      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium transition ${
                        active
                          ? 'bg-[var(--rank)]/15 border border-[var(--rank)] text-white font-semibold'
                          : 'bg-transparent border border-[#96AFEB]/20 text-[#A8B3CF] hover:border-[#96AFEB]/40 hover:text-white'
                      } ${session.status !== 'IDLE' ? 'opacity-60 cursor-default' : ''}`}
                    >
                      <SvgIcon name={SUBJECTS_CONFIG[subjName]} size={14} />
                      <span>{subjName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ĐỒNG HỒ ĐẾM GIỜ CONDENSED SIÊU LỚN */}
            <div className="relative z-10 text-center py-2">
              <div
                className="font-mono font-bold tracking-tight text-white leading-none select-none"
                style={{
                  fontSize: 'clamp(72px, 12vw, 140px)',
                  textShadow: session.status === 'RUNNING' ? '0 0 24px color-mix(in srgb, var(--rank) 45%, transparent)' : 'none',
                }}
              >
                <span>{clockH}</span>
                <span className="text-[#8390AF] px-1">:</span>
                <span>{clockM}</span>
                <span className="text-[#8390AF] px-1">:</span>
                <span className="text-[#A8B3CF]">{clockS}</span>
              </div>
              <p className="text-sm text-[#A8B3CF] mt-2 min-h-[1.5em]">
                {session.status === 'IDLE' && 'Chọn môn học và nguồn hình ảnh, rồi bấm Bắt đầu học.'}
                {session.status === 'RUNNING' && `Đang tính giờ cho ${currentSubject}. Hôm nay đã học ${todayHours.toFixed(1)}h.`}
                {session.status === 'PAUSED' && 'Phiên đang tạm dừng. Thời gian lúc này không được tính.'}
                {session.status === 'COMPLETED' && 'Phiên học đã hoàn thành và được lưu vào dữ liệu cá nhân.'}
              </p>
            </div>

            {/* Cảnh báo Pomodoro Check-in */}
            {session.requiresCheckIn && (
              <div className="relative z-10 w-full p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <span className="text-xs text-amber-300 font-medium">🔔 Điểm danh Pomodoro! Xác nhận bạn vẫn đang học.</span>
                <button
                  onClick={session.confirmCheckIn}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-xs transition shadow"
                >
                  Tôi Vẫn Đang Học
                </button>
              </div>
            )}

            {/* KHUNG GHI HÌNH (FEED) PHONG CÁCH GLASSMORPHISM */}
            <div className="relative z-10 w-full aspect-video max-h-[440px] bg-[#0D1424] border border-[#96AFEB]/20 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <video
                ref={media.setVideoElement}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${media.isReady ? 'block' : 'hidden'}`}
              />

              {/* Trạng thái tắt nguồn hình ảnh */}
              {!media.isReady && (
                <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-2 shadow">
                    <SvgIcon name={selectedMode === 'SCREEN' ? 'monitor' : 'video'} size={28} />
                  </div>
                  <h4 className="text-base font-semibold text-white">
                    {selectedMode === 'SCREEN' ? 'Chưa chia sẻ màn hình' : 'Camera đang tắt'}
                  </h4>
                  <p className="text-xs text-[#A8B3CF] max-w-md">
                    {selectedMode === 'SCREEN'
                      ? 'Khi trình duyệt hỏi, hãy chọn "Toàn bộ màn hình (Entire screen)" để được xác thực tính giờ.'
                      : 'Bật xem trước để kiểm tra góc quay khuôn mặt của bạn trước khi bắt đầu.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => media.start(selectedMode)}
                    className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white transition flex items-center gap-2"
                  >
                    <SvgIcon name="eye" size={16} />
                    <span>Bật xem trước</span>
                  </button>
                </div>
              )}

              {/* Overlay khi tạm dừng */}
              {session.status === 'PAUSED' && (
                <div className="absolute inset-0 bg-[#080C16]/70 backdrop-blur-sm z-20 flex items-center justify-center gap-2 text-sm font-semibold text-amber-300">
                  <SvgIcon name="pause" size={20} />
                  <span>Tạm dừng, thời gian không được tính</span>
                </div>
              )}

              {/* Nút chọn Nguồn (Glass Segment) ở góc trên bên trái */}
              <div className="absolute left-3 top-3 z-30 flex bg-[#080C17]/70 backdrop-blur-md p-1 rounded-xl border border-white/15">
                <button
                  type="button"
                  disabled={session.status !== 'IDLE'}
                  onClick={() => setSelectedMode('WEBCAM')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    selectedMode === 'WEBCAM' ? 'bg-white/20 text-white font-semibold shadow' : 'text-[#A8B3CF] hover:text-white'
                  }`}
                >
                  <SvgIcon name="video" size={14} />
                  <span>Camera</span>
                </button>
                <button
                  type="button"
                  disabled={session.status !== 'IDLE'}
                  onClick={() => setSelectedMode('SCREEN')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    selectedMode === 'SCREEN' ? 'bg-white/20 text-white font-semibold shadow' : 'text-[#A8B3CF] hover:text-white'
                  }`}
                >
                  <SvgIcon name="monitor" size={14} />
                  <span>Màn hình</span>
                </button>
              </div>

              {/* Badges góc trên bên phải */}
              <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
                {session.status === 'RUNNING' && (
                  <span className="px-3 py-1 rounded-full bg-[#080C17]/70 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Trực tiếp
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-[#080C17]/70 backdrop-blur-md border border-white/15 text-[11px] font-mono text-emerald-400">
                  {session.snapshotCount} snapshots
                </span>
              </div>

              {/* Badges góc dưới bên trái */}
              {media.isReady && (
                <div className="absolute left-3 bottom-3 z-30">
                  <span className="px-3 py-1 rounded-full bg-[#080C17]/70 backdrop-blur-md border border-white/15 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                    <SvgIcon name="check" size={13} />
                    <span>{selectedMode === 'SCREEN' ? 'Đang chia sẻ toàn màn hình' : 'Có mặt trước camera'}</span>
                  </span>
                </div>
              )}
            </div>

            {/* HÀNG NÚT ĐIỀU KHIỂN CHÍNH */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {session.status === 'IDLE' && (
                <button
                  type="button"
                  onClick={handleStartSession}
                  className="w-full sm:w-72 h-14 rounded-2xl bg-[#EAF0FB] hover:bg-white text-[#0A0F1C] font-bold text-base transition flex items-center justify-center gap-2.5 shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <SvgIcon name="play" size={20} />
                  <span>Bắt đầu học</span>
                </button>
              )}

              {session.status === 'RUNNING' && (
                <>
                  <button
                    type="button"
                    onClick={() => session.pause('MANUAL')}
                    className="w-full sm:w-56 h-14 rounded-2xl bg-[#EAF0FB] hover:bg-white text-[#0A0F1C] font-bold text-base transition flex items-center justify-center gap-2.5 shadow-xl"
                  >
                    <SvgIcon name="pause" size={20} />
                    <span>Tạm dừng</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStopSession}
                    className="w-full sm:w-44 h-14 rounded-2xl bg-transparent hover:bg-rose-500/10 border border-rose-500/40 text-rose-400 font-bold text-base transition flex items-center justify-center gap-2"
                  >
                    <SvgIcon name="square" size={18} />
                    <span>Kết thúc</span>
                  </button>
                </>
              )}

              {session.status === 'PAUSED' && (
                <>
                  <button
                    type="button"
                    onClick={session.resume}
                    className="w-full sm:w-56 h-14 rounded-2xl bg-[#EAF0FB] hover:bg-white text-[#0A0F1C] font-bold text-base transition flex items-center justify-center gap-2.5 shadow-xl"
                  >
                    <SvgIcon name="play" size={20} />
                    <span>Tiếp tục</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStopSession}
                    className="w-full sm:w-44 h-14 rounded-2xl bg-transparent hover:bg-rose-500/10 border border-rose-500/40 text-rose-400 font-bold text-base transition flex items-center justify-center gap-2"
                  >
                    <SvgIcon name="square" size={18} />
                    <span>Kết thúc</span>
                  </button>
                </>
              )}

              {session.status === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="w-full sm:w-72 h-14 rounded-2xl bg-[var(--rank)] hover:brightness-110 text-[#0A0F1C] font-bold text-base transition flex items-center justify-center gap-2.5 shadow-xl"
                >
                  <SvgIcon name="plus" size={20} />
                  <span>Phiên học mới</span>
                </button>
              )}
            </div>
          </section>

          {/* CỘT PHẢI (RAIL): BẬC RANK, TRẦN 12H, QUY TẮC */}
          <aside className="space-y-6">
            {/* THẺ 1: BẬC HIỆN TẠI (LỤC GIÁC & LADDER) */}
            <section className="bg-[#111A2E] border border-[#96AFEB]/15 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8390AF] mb-4">Bậc hiện tại</h2>
              <div className="flex items-center gap-4">
                <HexEmblem tierId={rankInfo.tier} div={rankInfo.div} size={84} />
                <div>
                  <div className="font-extrabold text-3xl tracking-tight text-white">{rankInfo.label}</div>
                  <div className="text-xs text-[#A8B3CF] mt-1">Đã học xác thực {rankInfo.hours.toFixed(1)}h</div>
                </div>
              </div>

              {/* Thanh tiến độ lên bậc kế */}
              <div className="mt-5 space-y-2">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="text-[#A8B3CF]">
                    {rankInfo.tier === 'CHALLENGER' ? `${rankInfo.hours.toFixed(1)}h` : `${rankInfo.hours.toFixed(1)}h / ${rankInfo.ceil}h`}
                  </span>
                  <span className="font-mono text-base text-[var(--rank)]">{rankInfo.pct}%</span>
                </div>
                <div className="w-full bg-[#172137] h-2.5 rounded-full overflow-hidden border border-[#96AFEB]/15">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${rankInfo.pct}%`,
                      backgroundColor: currentTierConfig.c,
                    }}
                  />
                </div>
                <p className="text-xs text-[#8390AF]">
                  {rankInfo.tier === 'CHALLENGER'
                    ? 'Bạn đang ở bậc cao nhất StudyHup.'
                    : `Còn ${rankInfo.toNext.toFixed(1)}h để lên ${rankInfo.nextLabel}.`}
                </p>
              </div>

              {/* Danh sách Thang bậc thu nhỏ (Ladder) */}
              <ol className="flex items-center justify-between mt-5 pt-4 border-t border-[#96AFEB]/15">
                {TIERS.map((t, idx) => {
                  const currentIdx = TIERS.findIndex((x) => x.id === rankInfo.tier);
                  const isDone = idx < currentIdx;
                  const isNow = idx === currentIdx;
                  return (
                    <li
                      key={t.id}
                      className={`transition ${isDone ? 'opacity-85' : isNow ? 'scale-110' : 'opacity-35 grayscale'}`}
                      title={t.name}
                    >
                      <HexEmblem tierId={t.id} size={isNow ? 38 : 26} />
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* THẺ 2: TRẦN GIỜ HỌC HÔM NAY (SVG RING) */}
            <section className="bg-[#111A2E] border border-[#96AFEB]/15 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8390AF] mb-4">Trần giờ học hôm nay</h2>
              <div className="flex items-center gap-5">
                <svg className="w-24 h-24 flex-none" viewBox="0 0 100 100">
                  <circle className="stroke-[#172137]" cx="50" cy="50" r="42" fill="none" strokeWidth="10" />
                  <circle
                    className="transition-all duration-500 ease-out"
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={capRatio >= 1 ? '#F2B94B' : 'var(--rank)'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="263.89"
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fill="#EAF0FB" className="font-mono font-bold text-lg">
                    {Math.round(capRatio * 100)}%
                  </text>
                </svg>
                <div>
                  <div className="font-extrabold text-2xl text-white font-mono">
                    {todayHours.toFixed(1)}h <span className="text-xs font-normal text-[#8390AF]">/ 12h</span>
                  </div>
                  <div className="text-xs text-[#A8B3CF] mt-1">
                    {capRatio >= 1 ? 'Đã đạt trần tối đa hôm nay' : `Còn lại ${(12 - todayHours).toFixed(1)}h`}
                  </div>
                </div>
              </div>
              {capRatio >= 1 && (
                <p className="text-xs text-amber-400 mt-3 pt-3 border-t border-[#96AFEB]/15">
                  ⚠️ Đã chạm trần 12 giờ. Thời gian học thêm hôm nay sẽ không được cộng dồn vào Rank.
                </p>
              )}
            </section>

            {/* THẺ 3: CÁCH XÁC THỰC PHIÊN HỌC */}
            <section className="border border-dashed border-[#96AFEB]/25 rounded-3xl p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8390AF] mb-3">Quy tắc tính giờ hợp lệ</h2>
              <ul className="space-y-3 text-xs text-[#A8B3CF]">
                <li className="flex items-start gap-2.5">
                  <span className="text-[var(--rank)] mt-0.5"><SvgIcon name="eye" size={16} /></span>
                  <span>Vắng mặt quá 5 phút, hệ thống sẽ tự động tạm dừng.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[var(--rank)] mt-0.5"><SvgIcon name="timer" size={16} /></span>
                  <span>Cứ mỗi 30 đến 50 phút, bạn cần bấm xác nhận đang có mặt.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[var(--rank)] mt-0.5"><SvgIcon name="shield-check" size={16} /></span>
                  <span>Không lưu video. Hệ thống chỉ chụp snapshot ngẫu nhiên mỗi 3–5 phút.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[var(--rank)] mt-0.5"><SvgIcon name="monitor" size={16} /></span>
                  <span>Mỗi tài khoản chỉ học được trên một thiết bị tại một thời điểm.</span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>

      {/* ===================== MODAL BẢNG XẾP HẠNG TOP 50 ===================== */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111A2E] border border-[#96AFEB]/20 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#96AFEB]/15 flex items-center justify-between bg-[#0D1424]">
              <div className="flex items-center gap-2.5">
                <SvgIcon name="trophy" size={24} className="text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Bảng Xếp Hạng Top 50</h3>
                  <p className="text-xs text-[#8390AF]">Những học viên kiên trì và tích lũy giờ học nhiều nhất</p>
                </div>
              </div>
              <button onClick={() => setIsLeaderboardOpen(false)} className="text-[#8390AF] hover:text-white p-1 rounded-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-neutral-800">
              {isLoadingLeaderboard ? (
                <div className="py-12 text-center text-xs text-[#8390AF]">
                  <div className="inline-block w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
                  <p>Đang tải bảng xếp hạng...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8390AF]">Chưa có dữ liệu. Hãy là người đầu tiên cày giờ học!</div>
              ) : (
                leaderboard.map((item, index) => {
                  const rankPos = index + 1;
                  const isMe = item.id === currentUser.id;
                  const userRankInfo = calculateRankData(item.totalHours);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                        isMe ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-[#172137]/60 border-[#96AFEB]/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 text-center font-bold text-sm flex-shrink-0">
                          {rankPos === 1 && '🥇'}
                          {rankPos === 2 && '🥈'}
                          {rankPos === 3 && '🥉'}
                          {rankPos > 3 && <span className="text-xs font-mono text-[#8390AF]">#{rankPos}</span>}
                        </div>
                        <HexEmblem tierId={userRankInfo.tier} div={userRankInfo.div} size={38} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-white truncate">{item.displayName}</p>
                            {isMe && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded">Bạn</span>}
                          </div>
                          <p className="text-[11px] text-[#8390AF] truncate">@{item.username}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-xs font-bold text-white font-mono">{item.totalHours.toFixed(1)}h</p>
                        <p className="text-[10px] text-[#8390AF]">{userRankInfo.label}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL PHÒNG HỌC TRỰC TUYẾN ===================== */}
      <LivePeersModal
        isOpen={isLivePeersOpen}
        onClose={() => setIsLivePeersOpen(false)}
        currentUserId={currentUser.id}
      /><FloatingMessenger
        currentUserId={currentUser.id}
        currentUserName={currentUser.displayName}
      />

      {/* ===================== MODAL CÀI ĐẶT HỒ SƠ ===================== */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111A2E] border border-[#96AFEB]/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#96AFEB]/15 flex items-center justify-between bg-[#0D1424]">
              <h3 className="font-bold text-white text-base">Hồ Sơ Học Viên</h3>
              <button onClick={() => setIsProfileOpen(false)} className="text-[#8390AF] hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium ${profileMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {profileMsg.text}
                </div>
              )}

              <div className="flex items-center gap-4 pb-2 border-b border-[#96AFEB]/15">
                <HexEmblem tierId={rankInfo.tier} div={rankInfo.div} size={58} />
                <div>
                  <h4 className="text-sm font-semibold text-white">{editDisplayName}</h4>
                  <p className="text-xs text-[#8390AF]">@{currentUser.username}</p>
                  <p className="text-[11px] text-[var(--rank)] mt-0.5">Tổng giờ học: {currentUser.totalHours.toFixed(1)}h</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A8B3CF]">Tên hiển thị</label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#080C17] border border-[#96AFEB]/20 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--rank)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A8B3CF]">Link ảnh đại diện (Avatar URL)</label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-[#080C17] border border-[#96AFEB]/20 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--rank)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="std"
                  checked={editIsStudent}
                  onChange={(e) => setEditIsStudent(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#080C17] border-[#96AFEB]/20 text-[var(--rank)]"
                />
                <label htmlFor="std" className="text-xs text-[#A8B3CF] cursor-pointer">
                  Tôi là Học sinh / Sinh viên
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#96AFEB]/15">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="px-4 py-2 bg-[#172137] text-[#A8B3CF] hover:text-white rounded-xl text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-[var(--rank)] text-[#0A0F1C] font-bold rounded-xl text-xs shadow hover:brightness-110"
                >
                  {isSavingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}