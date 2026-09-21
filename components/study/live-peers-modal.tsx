"use client";

import * as React from "react";

interface PeerItem {
  sessionId: string;
  subjectTag: string | null;
  startTime: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    currentRank: string;
  };
  latestSnapshot: {
    id: string;
    imageUrl: string;
    capturedAt: string;
    presenceVerified: boolean;
  } | null;
}

interface LivePeersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function LivePeersModal({ isOpen, onClose, currentUserId }: LivePeersModalProps) {
  const [peers, setPeers] = React.useState<PeerItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const fetchPeers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/study-sessions/active");
      if (res.ok) {
        const data = await res.json();
        setPeers(data);
      }
    } catch (e) {
      console.error("Không thể tải danh sách bạn học:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tự động tải lại ảnh sau mỗi 20 giây khi mở modal
  React.useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchPeers();

    const timer = setInterval(fetchPeers, 20000);
    return () => clearInterval(timer);
  }, [isOpen, fetchPeers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#96AFEB]/20 bg-[#111A2E] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#96AFEB]/15 bg-[#0D1424] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Phòng Học Trực Tuyến</h3>
              <p className="text-xs text-[#8390AF]">
                {peers.length} học viên đang tập trung • Tự động cập nhật ảnh mỗi 20s
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8390AF] hover:bg-[#172137] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Lưới Snapshot Grid */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-800">
          {isLoading && peers.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#8390AF]">
              <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p>Đang tìm kiếm bạn cùng học...</p>
            </div>
          ) : peers.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#8390AF]">
              Hiện chưa có ai khác đang trong phiên học. Hãy bắt đầu học để truyền cảm hứng cho mọi người!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {peers.map((item) => {
                const isMe = item.user.id === currentUserId;
                const timeAgo = item.latestSnapshot
                  ? new Date(item.latestSnapshot.capturedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null;

                return (
                  <div
                    key={item.sessionId}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border transition ${
                      isMe
                        ? "border-emerald-500/50 bg-[#142036]"
                        : "border-[#96AFEB]/15 bg-[#0D1424] hover:border-[#96AFEB]/40"
                    }`}
                  >
                    {/* Khung ảnh Snapshot */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                      {item.latestSnapshot?.imageUrl ? (
                        <img
                          src={item.latestSnapshot.imageUrl}
                          alt={`Snapshot của ${item.user.displayName}`}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#8390AF]">
                          <span className="text-2xl">📷</span>
                          <span className="text-[11px]">Chờ ảnh snapshot đầu tiên...</span>
                        </div>
                      )}

                      {/* Badge trạng thái trên ảnh */}
                      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live</span>
                      </div>

                      {timeAgo && (
                        <div className="absolute right-2.5 bottom-2.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-[#A8B3CF] backdrop-blur-sm">
                          {timeAgo}
                        </div>
                      )}
                    </div>

                    {/* Thông tin học viên */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.user.avatarUrl ? (
                          <img
                            src={item.user.avatarUrl}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover flex-shrink-0 border border-white/20"
                          />
                        ) : (
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1A253F] text-xs font-bold text-white">
                            {item.user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {item.user.displayName} {isMe && "(Bạn)"}
                          </p>
                          <p className="truncate text-[10px] text-[#8390AF]">
                            @{item.user.username}
                          </p>
                        </div>
                      </div>

                      <span className="flex-shrink-0 rounded-lg border border-[#96AFEB]/20 bg-[#172137] px-2 py-0.5 text-[10px] font-medium text-blue-300">
                        {item.subjectTag || "Tập trung"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}