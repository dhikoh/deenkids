"use client";
import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Send, Image, Plus, MessageSquare } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const authH = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
const apiFetch = async (url: string, opts: RequestInit = {}) => { const r = await fetch(url, { cache: "no-store", ...opts }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Error"); } return r.json(); };

export default function MessagesPage() {
  const [convos, setConvos] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [myId, setMyId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setMyId(JSON.parse(u).id || "");
    loadConvos();
    const i = setInterval(loadConvos, 10000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { if (activeConvo) loadMessages(activeConvo); }, [activeConvo]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadConvos = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try { const r = await apiFetch(`${API}/admin/messages/conversations`, { headers: authH(token) }); setConvos(r.data || []); } catch {}
  };

  const loadMessages = async (id: string) => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const r = await apiFetch(`${API}/admin/messages/${id}`, { headers: authH(token) });
      setMessages(r.data || []);
      await fetch(`${API}/admin/messages/${id}/read`, { method: "PUT", headers: authH(token) });
      loadConvos();
    } catch {}
  };

  const loadUsers = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try { const r = await apiFetch(`${API}/admin/messages/users`, { headers: authH(token) }); setUsers(r.data || []); setShowNewChat(true); } catch {}
  };

  const sendMessage = async (receiverId?: string) => {
    const token = Cookies.get("access_token"); if (!token || !text.trim()) return;
    const targetId = receiverId || convos.find(c => c.id === activeConvo)?.other?.id;
    if (!targetId) return;
    try {
      const fd = new FormData();
      fd.append("receiverId", targetId);
      fd.append("text", text);
      const r = await fetch(`${API}/admin/messages/send`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const res = await r.json();
      if (!r.ok) throw new Error(res.message);
      setText("");
      setActiveConvo(res.conversationId);
      setShowNewChat(false);
      loadMessages(res.conversationId);
      loadConvos();
    } catch (e: any) { toast.error(e.message); }
  };

  const sendImage = async (file: File) => {
    const token = Cookies.get("access_token"); if (!token) return;
    const targetId = convos.find(c => c.id === activeConvo)?.other?.id;
    if (!targetId) return;
    const fd = new FormData();
    fd.append("receiverId", targetId);
    fd.append("attachment", file);
    try {
      const r = await fetch(`${API}/admin/messages/send`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      loadMessages(activeConvo!);
    } catch (e: any) { toast.error(e.message); }
  };

  const activeOther = convos.find(c => c.id === activeConvo)?.other;
  const roleColors: Record<string, string> = { SUPERADMIN: "bg-purple-100 text-purple-700", ADMIN: "bg-sky-100 text-sky-700", AUTHOR: "bg-emerald-100 text-emerald-700" };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Sidebar */}
      <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Pesan</h3>
          <button onClick={loadUsers} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Plus size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {convos.length === 0 ? <p className="p-4 text-sm text-slate-500 text-center">Belum ada percakapan.</p> :
           convos.map(c => (
            <button key={c.id} onClick={() => { setActiveConvo(c.id); setShowNewChat(false); }}
              className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${activeConvo === c.id ? "bg-emerald-50" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-xs font-bold text-emerald-700">{c.other?.name?.substring(0, 2)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-800 truncate">{c.other?.name}</span>
                    {c.unreadCount > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{c.unreadCount}</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{c.lastMessage?.text || "📷 Gambar"}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {showNewChat ? (
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-bold text-slate-800 mb-3">Pilih Penerima</h3>
            <div className="space-y-2">
              {users.map(u => (
                <button key={u.id} onClick={() => { setShowNewChat(false); sendMessage(u.id); }}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-xs font-bold text-emerald-700">{u.name?.substring(0, 2)}</div>
                  <div className="text-left"><p className="text-sm font-bold text-slate-800">{u.name}</p><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleColors[u.role] || ""}`}>{u.role}</span></div>
                </button>
              ))}
            </div>
          </div>
        ) : !activeConvo ? (
          <div className="flex-1 flex items-center justify-center text-slate-400"><MessageSquare size={48} className="opacity-30" /><p className="ml-3 text-lg font-medium">Pilih percakapan atau mulai chat baru</p></div>
        ) : (
          <>
            {activeOther && (
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-xs font-bold text-emerald-700">{activeOther.name?.substring(0, 2)}</div>
                <div><p className="font-bold text-slate-800 text-sm">{activeOther.name}</p><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleColors[activeOther.role] || ""}`}>{activeOther.role}</span></div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.senderId === myId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${m.senderId === myId ? "bg-emerald-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                    {m.attachmentUrl && <img src={`${API.replace("/api", "")}${m.attachmentUrl}`} alt="attachment" className="rounded-xl mb-2 max-w-full max-h-60 object-cover" />}
                    {m.text && <p className="text-sm">{m.text}</p>}
                    <p className={`text-[10px] mt-1 ${m.senderId === myId ? "text-white/60" : "text-slate-400"}`}>{new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-slate-100 flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"><Image size={20} /></button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) sendImage(e.target.files[0]); }} />
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Ketik pesan..." />
              <button onClick={() => sendMessage()} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><Send size={18} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
