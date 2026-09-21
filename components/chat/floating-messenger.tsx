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
  isOnline: boolean;
}

export function FloatingMessenger({
  currentUserId,
  currentUserName,
}: {
  currentUserId: string;
  currentUserName: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [peers, setPeers] = React.useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = React.useState<Peer | null>(null);
  const [messages, setMessages] = React.useState<MessageItem[]>([]);
  const [inputText, setInputText] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Tải toàn bộ danh sách bạn học (cả online và offline)
  const loadPeers = async () => {
    try {
      const res = await fetch("/api/chat/peers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPeers(data);
        }
      }
    } catch (e) {
      console.error("Lỗi tải danh sách bạn học:", e);
    }
  };

  React.useEffect(() => {
    if (isOpen) loadPeers();
  }, [isOpen]);

  // Tải lịch sử chat và lắng nghe Realtime khi chọn một bạn học
  React.useEffect(() => {
    if (!selectedPeer?.id) return;

    fetch(`/api/messages?receiverId=${selectedPeer.id}&currentUserId=${currentUserId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => setMessages([]));

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

  // Gửi tin nhắn (gửi được cho cả người online lẫn offline)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPeer?.id) return;

    const text = inputText.trim();
    setInputText("");

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

      if (res.ok) {
        const savedMsg = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? savedMsg : m))
        );
      } else {
        const err = await res.json();
        console.error("Lỗi gửi tin nhắn:", err);
      }
    } catch (err) {
      console.error("Lỗi mạng:", err);
    }
  };

  const onlinePeers = peers.filter((p) => p.isOnline);
  const offlinePeers = peers.filter((p) => !p.isOnline);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 flex h-[480px] w-80 sm:w-96 flex-col overflow-hidden rounded-3xl border border-[#96AFEB]/20 bg-[#111A2E] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5">
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
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    selectedPeer
                      ? selectedPeer.isOnline
                        ? "bg-emerald-500"
                        : "bg-slate-500"
                      : "bg-blue-500"
                  }`}
                />
              </span>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  {selectedPeer
                    ? selectedPeer.displayName || selectedPeer.username
                    : "Messenger Bạn Học"}
                </h4>
                {selectedPeer && (
                  <p className="text-[10px] text-[#8390AF]">
                    {selectedPeer.isOnline ? "Đang trực tuyến" : "Ngoại tuyến (nhận tin nhắn chờ)"}
                  </p>
                )}
              </div>
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
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-neutral-800">
              {peers.length === 0 ? (
                <div className="py-20 text-center text-xs text-[#8390AF]">
                  Chưa có bạn học nào trong hệ thống.
                </div>
              ) : (
                <>
                  {/* Danh sách Online */}
                  {onlinePeers.length > 0 && (
                    <div className="space-y-1">
                      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Đang trực tuyến ({onlinePeers.length})
                      </p>
                      {onlinePeers.map((peer) => (
                        <PeerRow key={peer.id} peer={peer} onSelect={() => setSelectedPeer(peer)} />
                      ))}
                    </div>
                  )}

                  {/* Danh sách Offline */}
                  {offlinePeers.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#8390AF]">
                        Ngoại tuyến ({offlinePeers.length})
                      </p>
                      {offlinePeers.map((peer) => (
                        <PeerRow key={peer.id} peer={peer} onSelect={() => setSelectedPeer(peer)} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // Khung trò chuyện 1-1
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-800">
                {messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#8390AF]">
                    Chưa có tin nhắn. Hãy gửi tin nhắn cho {selectedPeer.displayName || selectedPeer.username}!
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
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words ${
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
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition"
                >
                  Gửi
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Nút tròn nổi Messenger */}
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

// Component từng dòng tài khoản bạn học
function PeerRow({ peer, onSelect }: { peer: Peer; onSelect: () => void }) {
  const name = peer.displayName || peer.username || "Học viên";
  const initial = name.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-2xl p-2 hover:bg-[#172137] transition text-left"
    >
      <div className="relative flex-shrink-0">
        {peer.avatarUrl ? (
          <img src={peer.avatarUrl} className="h-9 w-9 rounded-full object-cover" alt="" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
            {initial}
          </div>
        )}
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#111A2E] ${
            peer.isOnline ? "bg-emerald-500" : "bg-slate-500"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{name}</p>
        <p className="truncate text-[10px] text-[#8390AF]">
          {peer.isOnline ? (
            <span className="text-emerald-400">Đang trực tuyến</span>
          ) : (
            "Ngoại tuyến"
          )}
        </p>
      </div>
    </button>
  );
}