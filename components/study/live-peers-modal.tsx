"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase-browser";

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

interface RoomMsg {
  id: string;
  sender_name: string;
  content: string;
  created_at: string;
  room_id?: string;
}

export function LivePeersModal({
  isOpen,
  onClose,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}) {
  const [peers, setPeers] = React.useState<PeerItem[]>([]);
  const [messages, setMessages] = React.useState<RoomMsg[]>([]);
  const [msgInput, setMsgInput] = React.useState("");
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  const fetchPeers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/study-sessions/active");
      if (res.ok) {
        const data = await res.json();
        setPeers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách phiên học:", e);
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    fetchPeers();
    const timer = setInterval(fetchPeers, 20000);

    // Tải lịch sử tin nhắn phòng với kiểm tra mảng an toàn
    fetch("/api/messages?roomId=study_room")
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]));

    // Lắng nghe Realtime tin nhắn phòng và lọc trùng ID
    const channel = supabase
      .channel("room_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (p) => {
          const msg = p.new as RoomMsg;
          if (msg.room_id === "study_room") {
            setMessages((prev) => {
              const list = Array.isArray(prev) ? prev : [];
              if (list.some((m) => m.id === msg.id)) return list;
              return [...list, msg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [isOpen, fetchPeers]);

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Gửi tin nhắn phòng và hiển thị ngay lập tức
  const sendRoomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;

    const text = msgInput.trim();
    setMsgInput("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, roomId: "study_room" }),
      });

      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          setMessages((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (list.some((m) => m.id === saved.id)) return list;
            return [...list, saved];
          });
        }
      } else {
        const err = await res.json();
        console.error("Lỗi gửi tin nhắn phòng:", err);
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn phòng:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex h-[88vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-[#96AFEB]/20 bg-[#111A2E] shadow-2xl flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#96AFEB]/15 bg-[#0D1424] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Phòng Học Trực Tuyến & Chat Chung</h3>
              <p className="text-xs text-[#8390AF]">{peers.length} học viên đang có mặt</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8390AF] hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        {/* Thân Modal: Trái (Snapshots) - Phải (Chat phòng) */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
          {/* Lưới Snapshot */}
          <div className="overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-neutral-800">
            {peers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[#8390AF]">
                Hiện tại chưa có học viên nào khác trong phòng.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {peers.map((item) => (
                  <div
                    key={item.sessionId}
                    className="overflow-hidden rounded-2xl border border-[#96AFEB]/15 bg-[#0D1424]"
                  >
                    <div className="relative aspect-video w-full bg-black/50 flex items-center justify-center">
                      {item.latestSnapshot?.imageUrl ? (
                        <img
                          src={item.latestSnapshot.imageUrl}
                          className="h-full w-full object-cover"
                          alt=""
                        />
                      ) : (
                        <span className="text-xs text-[#8390AF]">📷 Chờ snapshot...</span>
                      )}
                    </div>
                    <div className="p-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                        {item.user?.displayName || item.user?.username || "Học viên"}
                      </span>
                      <span className="text-[10px] bg-[#172137] px-2 py-0.5 rounded text-blue-300">
                        {item.subjectTag || "Tập trung"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Khung Chat Chung */}
          <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-[#96AFEB]/15 bg-[#0A0F1C]">
            <div className="border-b border-[#96AFEB]/10 px-4 py-2.5 text-xs font-semibold text-[#8390AF]">
              💬 Trò chuyện phòng học
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs scrollbar-thin scrollbar-thumb-neutral-800">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8390AF]">
                  Chưa có tin nhắn nào. Hãy gửi lời chào đến phòng học!
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="bg-[#111A2E] border border-[#96AFEB]/10 p-2.5 rounded-xl">
                    <p className="font-bold text-blue-400 text-[11px]">{m.sender_name}</p>
                    <p className="text-white mt-0.5 break-words">{m.content}</p>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={sendRoomMessage} className="p-2.5 border-t border-[#96AFEB]/10 flex gap-2">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Nhắn vào phòng..."
                className="flex-1 bg-[#111A2E] border border-[#96AFEB]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-xl text-xs font-bold text-white transition"
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}