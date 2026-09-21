"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase-browser";

interface MessageItem {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  receiver_id: string | null;
  content: string;
  created_at: string;
}

interface Peer {
  id: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
}

export function FloatingMessenger({
  currentUserId,
  currentUserName,
}: {
  currentUserId: string;
  currentUserName: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activePeers, setActivePeers] = React.useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = React.useState<Peer | null>(null);
  const [messages, setMessages] = React.useState<MessageItem[]>([]);
  const [inputText, setInputText] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Tải danh sách bạn học đang online
  const loadOnlinePeers = async () => {
    try {
      const res = await fetch("/api/study-sessions/active");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const list: Peer[] = data
            .map((item: any) => item?.user)
            .filter((u: any): u is Peer => Boolean(u && u.id && u.id !== currentUserId));

          const unique = Array.from(new Map(list.map((m) => [m.id, m])).values());
          setActivePeers(unique);
        }
      }
    } catch (e) {
      console.error("Lỗi tải danh sách bạn học:", e);
    }
  };

  React.useEffect(() => {
    if (isOpen) loadOnlinePeers();
  }, [isOpen]);

  // Tải lịch sử chat và lắng nghe tin nhắn mới
  React.useEffect(() => {
    if (!selectedPeer?.id) return;

    fetch(`/api/messages?receiverId=${selectedPeer.id}&currentUserId=${currentUserId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => setMessages([]));

    // Lắng nghe Realtime qua Supabase WebSocket
    const channel = supabase
      .channel(`direct_${selectedPeer.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as MessageItem;
          if (
            (newMsg.sender_id === selectedPeer.id && newMsg.receiver_id === currentUserId) ||
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === selectedPeer.id)
          ) {
            setMessages((prev) => {
              const list = Array.isArray(prev) ? prev : [];
              if (list.some((m) => m.id === newMsg.id)) return list;
              return [...list, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPeer, currentUserId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Gửi tin nhắn và hiện lên màn hình NGAY LẬP TỨC
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPeer?.id) return;

    const text = inputText.trim();
    setInputText("");

    // 1. Tạo tin nhắn tạm để hiển thị tức thì trên màn hình (không cần chờ mạng)
    const tempId = "temp_" + Date.now();
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: currentUserId,
      sender_name: currentUserName || "Tôi",
      sender_avatar: null,
      receiver_id: selectedPeer.id,
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...(Array.isArray(prev) ? prev : []), optimisticMsg]);

    // 2. Gửi dữ liệu về máy chủ
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          receiverId: selectedPeer.id,
          senderId: currentUserId,
          senderName: currentUserName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert("Lỗi gửi tin nhắn: " + (errData.error || res.statusText));
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      const savedMsg = await res.json();
      // Thay thế ID tạm bằng ID thật từ Database
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? savedMsg : m))
      );
    } catch (err: any) {
      console.error("Lỗi kết nối:", err);
      alert("Lỗi kết nối: " + err.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Khung Chatbox Messenger */}
      {isOpen && (
        <div className="mb-3 flex h-[460px] w-80 sm:w-96 flex-col overflow-hidden rounded-3xl border border-[#96AFEB]/20 bg-[#111A2E] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#96AFEB]/15 bg-[#0D1424] px-4 py-3">
            <div className="flex items-center gap-2">
              {selectedPeer && (
                <button
                  type="button"
                  onClick={() => setSelectedPeer(null)}
                  className="mr-1 text-xs text-[#8390AF] hover:text-white"
                >
                  ←
                </button>
              )}
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <h4 className="text-xs font-bold text-white">
                {selectedPeer
                  ? selectedPeer.displayName || selectedPeer.username || "Bạn học"
                  : "Messenger Bạn Học"}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#8390AF] hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          {!selectedPeer ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#8390AF]">
                Đang trực tuyến ({activePeers.length})
              </p>
              {activePeers.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#8390AF]">
                  Chưa có bạn học nào khác trực tuyến lúc này.
                </div>
              ) : (
                activePeers.map((peer) => {
                  const peerName = peer.displayName || peer.username || "Học viên";
                  const initialLetter = peerName.charAt(0).toUpperCase();

                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => setSelectedPeer(peer)}
                      className="flex w-full items-center gap-3 rounded-2xl p-2 hover:bg-[#172137] transition text-left"
                    >
                      {peer.avatarUrl ? (
                        <img
                          src={peer.avatarUrl}
                          className="h-9 w-9 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
                          {initialLetter}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">{peerName}</p>
                        <p className="truncate text-[10px] text-emerald-400">Đang trong phiên học</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-800">
                {messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#8390AF]">
                    Hãy bắt đầu cuộc trò chuyện với {selectedPeer.displayName || selectedPeer.username}!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-[#1A253F] text-[#EAF0FB] border border-[#96AFEB]/15 rounded-bl-none"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Ô gõ tin nhắn */}
              <form
                onSubmit={handleSend}
                className="border-t border-[#96AFEB]/15 bg-[#0D1424] p-2.5 flex gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Nhắn cho ${selectedPeer.displayName || selectedPeer.username}...`}
                  className="flex-1 rounded-xl bg-[#111A2E] border border-[#96AFEB]/20 px-3 py-2 text-xs text-white placeholder-[#8390AF] focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 transition"
                >
                  Gửi
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Nút tròn Messenger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl hover:scale-105 active:scale-95 transition"
        title="Nhắn tin Messenger"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.909 1.455 5.513 3.734 7.187-.163 1.341-.66 3.32-2.127 4.547 0 0 2.993.208 5.617-1.574.887.246 1.817.378 2.776.378 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.445l-2.673-2.853-5.214 2.853 5.736-6.09 2.74 2.853 5.148-2.853-5.737 6.09z" />
        </svg>
      </button>
    </div>
  );
}