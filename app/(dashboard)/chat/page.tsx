"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  MessageSquare,
  Send,
  Search,
  Users,
  Hash,
  ShieldAlert,
  ShieldCheck,
  Plus,
  RefreshCw,
  CheckCheck,
  Clock,
  Paperclip,
  Eye,
  AlertCircle,
  FileText,
  User,
  Radio,
  Layers,
} from "lucide-react";
import {
  fetchConversations,
  fetchConversationMessages,
  postChatMessage,
  startDirectChat,
  markChatRead,
  ChatMessageRecord,
  ChatConversationRecord,
} from "@/lib/services/chat-service";
import { getClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser } from "@/lib/auth/auth-types";

export default function ChatPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);

  // Mode: "my_chats" vs "admin_all" (Admin Surveillance)
  const [chatMode, setChatMode] = React.useState<"my_chats" | "admin_all">("my_chats");

  // Conversations & selected conversation
  const [conversations, setConversations] = React.useState<ChatConversationRecord[]>([]);
  const [loadingConversations, setLoadingConversations] = React.useState(true);
  const [selectedConvId, setSelectedConvId] = React.useState<string | null>(null);

  // Messages in active conversation
  const [messages, setMessages] = React.useState<ChatMessageRecord[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [newMessageText, setNewMessageText] = React.useState("");
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [refreshingMessages, setRefreshingMessages] = React.useState(false);
  const [refreshingConvs, setRefreshingConvs] = React.useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = React.useState("");

  // New Chat Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = React.useState(false);
  const [availableUsers, setAvailableUsers] = React.useState<AuthUser[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = React.useState("");
  const [userSearch, setUserSearch] = React.useState("");

  // Admin User Pair Inspector State
  const [adminUser1, setAdminUser1] = React.useState("");
  const [adminUser2, setAdminUser2] = React.useState("");

  // Auto-scroll ref
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  // Check current session
  React.useEffect(() => {
    const user = getClientAuthUser();
    setCurrentUser(user);

    // Fetch all users for new chat & admin pairing
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.users)) {
          setAvailableUsers(d.users);
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = React.useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === "super_admin";
  }, [currentUser]);

  // Load conversations based on mode
  const loadConversations = React.useCallback(async (targetConvIdOrKeep?: string | boolean) => {
    try {
      const data = await fetchConversations({
        mode: chatMode === "admin_all" && isAdmin ? "admin_all" : undefined,
        userId: currentUser ? String(currentUser.id) : undefined,
      });
      setConversations(data);

      if (typeof targetConvIdOrKeep === "string") {
        setSelectedConvId(targetConvIdOrKeep);
      } else if (targetConvIdOrKeep === false) {
        if (data.length > 0) {
          setSelectedConvId(data[0].id);
        } else {
          setSelectedConvId(null);
        }
      } else if (!selectedConvId && data.length > 0) {
        setSelectedConvId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, [chatMode, isAdmin, currentUser, selectedConvId]);

  React.useEffect(() => {
    if (currentUser) {
      setLoadingConversations(true);
      loadConversations(false);
    }
  }, [chatMode, currentUser]);

  // Polling conversations list every 5 seconds for new message counters
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadConversations(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Load messages when selectedConvId changes
  const loadMessages = React.useCallback(async (convId: string, afterId?: string) => {
    try {
      const msgs = await fetchConversationMessages(convId, afterId);
      if (afterId) {
        if (msgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = msgs.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newOnes];
          });
        }
      } else {
        setMessages(msgs);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  React.useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    loadMessages(selectedConvId).then(() => {
      setLoadingMessages(false);
      markChatRead(selectedConvId);
    });
  }, [selectedConvId, loadMessages]);

  // Polling active conversation messages every 2.5 seconds (delta sync)
  React.useEffect(() => {
    if (!selectedConvId) return;

    const interval = setInterval(() => {
      const lastMsg = messages[messages.length - 1];
      const afterId = lastMsg ? lastMsg.id : undefined;
      loadMessages(selectedConvId, afterId);
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedConvId, messages, loadMessages]);

  // Scroll to bottom when messages update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Selected conversation object
  const activeConversation = React.useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Filter conversations
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.otherParticipant && c.otherParticipant.name.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.message.toLowerCase().includes(q)) ||
        (c.participants && c.participants.some((p) => p.name.toLowerCase().includes(q)))
    );
  }, [conversations, searchQuery]);

  const channelConversations = React.useMemo(() => {
    return filteredConversations.filter((c) => c.type === "channel");
  }, [filteredConversations]);

  const directConversations = React.useMemo(() => {
    return filteredConversations.filter((c) => c.type === "direct");
  }, [filteredConversations]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !newMessageText.trim()) return;

    const textToSend = newMessageText.trim();
    setNewMessageText("");
    setSendingMessage(true);

    try {
      const created = await postChatMessage({
        conversationId: selectedConvId,
        message: textToSend,
        senderId: currentUser ? String(currentUser.id) : undefined,
      });

      if (created) {
        setMessages((prev) => [...prev, created]);
        loadConversations(true);
      } else {
        toast({
          type: "error",
          message: "Failed to Send",
          description: "Could not deliver your message. Please retry.",
        });
      }
    } catch {
      toast({
        type: "error",
        message: "Error",
        description: "An unexpected error occurred while sending.",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Start new direct chat
  const handleStartChatWithUser = async (targetId: string) => {
    try {
      const convId = await startDirectChat(
        targetId,
        currentUser ? String(currentUser.id) : undefined
      );
      if (convId) {
        setIsNewChatModalOpen(false);
        setChatMode("my_chats");
        setSelectedConvId(convId);
        await loadConversations(convId);
        toast({
          type: "success",
          message: "Direct Chat Opened",
          description: "Connected to user conversation.",
        });
      }
    } catch {
      toast({
        type: "error",
        message: "Failed to Open Chat",
        description: "Could not create direct thread.",
      });
    }
  };

  // Admin Pair Inspector submit
  const handleInspectUserPair = async () => {
    if (!adminUser1 || !adminUser2) {
      toast({
        type: "error",
        message: "Pair Selection Required",
        description: "Please select both User A and User B to inspect their private chat.",
      });
      return;
    }
    if (adminUser1 === adminUser2) {
      toast({
        type: "error",
        message: "Invalid Pair",
        description: "Please select two distinct users.",
      });
      return;
    }

    try {
      const convId = await startDirectChat(adminUser2, adminUser1);
      if (convId) {
        setSelectedConvId(convId);
        await loadConversations(convId);
        toast({
          type: "success",
          message: "Conversation Located",
          description: "Loaded transcript between selected users.",
        });
      }
    } catch {
      toast({
        type: "error",
        message: "Lookup Failed",
        description: "Could not load conversation between selected users.",
      });
    }
  };

  return (
    <>
      <TopNav title="Factory Communication & Floor Messaging Hub" />

      <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto pb-16">
        {/* Page Header with Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Team Chat & Live Dispatch
                </h1>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Direct peer messaging between factory supervisors, accounts, and floor management.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChatMode("my_chats")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    chatMode === "my_chats"
                      ? "bg-white text-blue-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  My Conversations
                </button>

                <button
                  type="button"
                  onClick={() => setChatMode("admin_all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    chatMode === "admin_all"
                      ? "bg-amber-600 text-white shadow-xs font-bold"
                      : "text-amber-800 hover:text-amber-900 hover:bg-amber-50/50"
                  }`}
                  title="Global surveillance of all communications across all users"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Admin Global Oversight
                </button>
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsNewChatModalOpen(true)}
            >
              New Chat
            </Button>
          </div>
        </div>

        {/* Admin Surveillance Banner */}
        {chatMode === "admin_all" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0" />
              <div>
                <p className="font-bold text-amber-950">
                  Administrative Global Surveillance & Conversation Audit
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  You are viewing all communications across all factory personnel. All direct messages and department logs are audited in compliance with factory ERP security protocols.
                </p>
              </div>
            </div>

            {/* Quick Pair Inspector Dropdowns */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <select
                value={adminUser1}
                onChange={(e) => setAdminUser1(e.target.value)}
                className="text-xs bg-white border border-amber-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select User 1...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.roleTitle || u.role})
                  </option>
                ))}
              </select>

              <span className="font-bold text-amber-700">↔</span>

              <select
                value={adminUser2}
                onChange={(e) => setAdminUser2(e.target.value)}
                className="text-xs bg-white border border-amber-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select User 2...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.roleTitle || u.role})
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                size="sm"
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs border-amber-800"
                onClick={handleInspectUserPair}
              >
                Inspect Thread
              </Button>
            </div>
          </div>
        )}

        {/* Main 2-Panel Messenger Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px]">
          {/* Left Panel: Conversations & Channels Directory */}
          <Card className="lg:col-span-4 flex flex-col h-full border-slate-200/80 shadow-xs bg-white overflow-hidden">
            {/* Search and Filter */}
            <div className="p-3 border-b border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    chatMode === "admin_all"
                      ? "Search all conversations & users..."
                      : "Search my chats & channels..."
                  }
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                <span>
                  {chatMode === "admin_all" ? "All Factory Threads" : "My Active Threads"}
                </span>
                <button
                  type="button"
                  disabled={refreshingConvs}
                  onClick={async () => {
                    setRefreshingConvs(true);
                    await loadConversations(true);
                    setRefreshingConvs(false);
                  }}
                  className={`flex items-center gap-1 transition-all duration-200 ${
                    refreshingConvs
                      ? "text-blue-400 cursor-not-allowed"
                      : "text-blue-600 hover:text-blue-800 cursor-pointer hover:scale-105"
                  }`}
                  title="Refresh Conversations"
                >
                  <RefreshCw className={`h-3 w-3 transition-transform ${
                    refreshingConvs ? "animate-spin" : ""
                  }`} />
                  <span className="text-[11px] font-medium">
                    {refreshingConvs ? "Refreshing..." : "Refresh"}
                  </span>
                </button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingConversations && conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-500" />
                  <p>Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <MessageSquare className="h-6 w-6 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No conversations found</p>
                  <p className="text-[11px]">Click &quot;New Chat&quot; to message a colleague.</p>
                </div>
              ) : (
                <>
                  {/* Channels Group */}
                  {channelConversations.length > 0 && (
                    <div className="p-2 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                        Department Channels
                      </span>
                      {channelConversations.map((conv) => {
                        const isSelected = selectedConvId === conv.id;
                        return (
                          <button
                            key={conv.id}
                            type="button"
                            onClick={() => setSelectedConvId(conv.id)}
                            className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start gap-2.5 cursor-pointer ${
                              isSelected
                                ? "bg-blue-50/80 border border-blue-200"
                                : "hover:bg-slate-50 border border-transparent"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                              <Hash className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {conv.title}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {conv.lastMessage
                                  ? `${conv.lastMessage.senderName}: ${conv.lastMessage.message}`
                                  : conv.description || "Active Channel"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Direct Messages Group */}
                  {directConversations.length > 0 && (
                    <div className="p-2 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                        Direct Messages & Pairs
                      </span>
                      {directConversations.map((conv) => {
                        const isSelected = selectedConvId === conv.id;
                        const other = conv.otherParticipant;
                        return (
                          <button
                            key={conv.id}
                            type="button"
                            onClick={() => setSelectedConvId(conv.id)}
                            className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start gap-2.5 cursor-pointer ${
                              isSelected
                                ? "bg-blue-50/80 border border-blue-200"
                                : "hover:bg-slate-50 border border-transparent"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-slate-700 to-indigo-700 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
                              {other?.initials || "DM"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {conv.title}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                  {conv.lastMessage
                                    ? conv.lastMessage.message
                                    : "No messages yet"}
                                </p>
                                {conv.totalMessagesCount !== undefined && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {conv.totalMessagesCount} msgs
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Right Panel: Active Chat Room */}
          <Card className="lg:col-span-8 flex flex-col h-full border-slate-200/80 shadow-xs bg-white overflow-hidden">
            {activeConversation ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {activeConversation.type === "channel" ? (
                        <Hash className="h-4 w-4" />
                      ) : (
                        activeConversation.otherParticipant?.initials || "DM"
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 truncate">
                          {activeConversation.title}
                        </h2>
                        <Badge
                          variant={activeConversation.type === "channel" ? "primary" : "default"}
                        >
                          {activeConversation.type === "channel" ? "Channel" : "Direct Message"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {activeConversation.otherParticipant
                          ? `${activeConversation.otherParticipant.department} • ${activeConversation.otherParticipant.role}`
                          : activeConversation.description || "Live Factory Communication"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={refreshingMessages}
                      onClick={async () => {
                        setRefreshingMessages(true);
                        await loadMessages(activeConversation.id);
                        setTimeout(() => setRefreshingMessages(false), 600);
                      }}
                      className={`p-1.5 rounded-md transition-all duration-200 group ${
                        refreshingMessages
                          ? "text-blue-500 bg-blue-50 cursor-not-allowed"
                          : "text-slate-400 hover:text-blue-600 hover:bg-white cursor-pointer"
                      }`}
                      title="Reload Messages"
                    >
                      <RefreshCw className={`h-4 w-4 transition-transform duration-300 ${
                        refreshingMessages ? "animate-spin" : "group-hover:rotate-180"
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Audit Notice in Admin Mode */}
                {chatMode === "admin_all" && (
                  <div className="bg-amber-50/70 border-b border-amber-100 px-4 py-1.5 text-[11px] text-amber-800 flex items-center gap-2 font-medium">
                    <Eye className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>
                      Administrator Surveillance Active — Viewing live conversation transcripts for oversight.
                    </span>
                  </div>
                )}

                {/* Message Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-500" />
                      <p>Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                      <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">No messages in this conversation</p>
                      <p>Send a message below to start the discussion.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = currentUser && String(msg.senderId) === String(currentUser.id);
                      const isSystem = msg.messageType === "system";

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                              {msg.message}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && (
                            <div className="h-7 w-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {msg.senderInitials || "U"}
                            </div>
                          )}

                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs space-y-1 ${
                              isMe
                                ? "bg-blue-600 text-white rounded-br-xs"
                                : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs"
                            }`}
                          >
                            {!isMe && (
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                <span className="text-slate-900 font-bold">{msg.senderName}</span>
                                <span>•</span>
                                <span>{msg.senderDepartment}</span>
                              </div>
                            )}

                            <p className="leading-relaxed whitespace-pre-wrap break-words text-xs">
                              {msg.message}
                            </p>

                            <div
                              className={`flex items-center justify-end gap-1 text-[10px] ${
                                isMe ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isMe && <CheckCheck className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-200/80 bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={`Message ${activeConversation.title}...`}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />

                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={!newMessageText.trim() || sendingMessage}
                    loading={sendingMessage}
                    leftIcon={<Send className="h-4 w-4" />}
                  >
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">No Chat Selected</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a channel or colleague from the left panel to begin chatting.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setIsNewChatModalOpen(true)}
                >
                  Start New Discussion
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Start New Chat Modal */}
      <Modal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        title="Start Direct Discussion"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select an active factory colleague to open a direct peer-to-peer chat thread.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name, role, or department..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {availableUsers
              .filter(
                (u) =>
                  !currentUser || String(u.id) !== String(currentUser.id)
              )
              .filter(
                (u) =>
                  !userSearch.trim() ||
                  u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                  (u.department && u.department.toLowerCase().includes(userSearch.toLowerCase())) ||
                  (u.roleTitle && u.roleTitle.toLowerCase().includes(userSearch.toLowerCase()))
              )
              .map((u) => (
                <div
                  key={u.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {u.initials || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {u.roleTitle || u.role} • {u.department}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => handleStartChatWithUser(String(u.id))}
                  >
                    Message
                  </Button>
                </div>
              ))}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setIsNewChatModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
