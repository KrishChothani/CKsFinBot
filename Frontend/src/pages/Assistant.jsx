/** @format */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bot, PanelLeftOpen, FileEdit, MessageSquare } from "lucide-react";

import {
  getAllConversations,
  getConversationById,
  createConversation,
  deleteConversation,
  createChatMessage,
  uploadDocuments,
  updateConversationFeature,
} from "../services/apiClient";

import Message from "../JSX/Components/Message";
import ChatInput from "../JSX/Components/ChatInput";
import FeatureSelector from "../JSX/Components/FeatureSelector";
import Sidebar from "../JSX/Components/Sidebar";
import WelcomeScreen from "../JSX/Components/WelcomeScreen";
import FinancialDraft from "../JSX/Components/FinancialDraft";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";

export default function AssistantPage() {
  const [mode, setMode] = useState("chat"); // "chat" | "draft"
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentConversationDocs, setCurrentConversationDocs] = useState([]);
  const [input, setInput] = useState("");
  const [feature, setFeature] = useState("Smart_Chat");
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const response = await getAllConversations();
        const convos = response.data?.data || [];
        setConversations(convos);
        if (convos.length > 0) {
          setCurrentConversationId(convos[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchConversationDetails = useCallback(
    async (showLoading = true) => {
      if (!currentConversationId) return;
      if (showLoading) setIsLoading(true);
      try {
        const response = await getConversationById(currentConversationId);
        const data = response.data?.data;
        setMessages(data.messages || []);
        setCurrentConversationDocs(data.documents || []);
        setCurrentConversation(data.conversation);

        if (data.conversation?.featureUsed) {
          setFeature(data.conversation.featureUsed);
          if (
            data.conversation.featureUsed === "Financial_Drafter" ||
            data.conversation.featureUsed === "Document_Drafter" ||
            data.conversation.featureUsed === "Legal_Drafter"
          ) {
            setMode("draft");
          }
        }
      } catch (error) {
        console.error("Failed to fetch conversation details:", error);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [currentConversationId]
  );

  useEffect(() => {
    fetchConversationDetails();
  }, [fetchConversationDetails]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleNewChat = async () => {
    try {
      const response = await createConversation("New Chat", feature);
      const newConvo = response.data.data;
      setConversations((prev) => [newConvo, ...prev]);
      setCurrentConversationId(newConvo._id);
      setMessages([]);
      setCurrentConversationDocs([]);
      setCurrentConversation(newConvo);
      return newConvo;
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleFeatureChange = async (newFeature) => {
    setFeature(newFeature);
    if (
      newFeature === "Financial_Drafter" ||
      newFeature === "Document_Drafter" ||
      newFeature === "Legal_Drafter"
    ) {
      setMode("draft");
    } else {
      setMode("chat");
    }

    if (currentConversationId) {
      try {
        await updateConversationFeature(currentConversationId, newFeature);
      } catch (error) {
        console.error("Failed to update feature:", error);
      }
    }
  };

  const handleDeleteChat = async (conversationId) => {
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await deleteConversation(conversationId);
      const updated = conversations.filter((c) => c._id !== conversationId);
      setConversations(updated);
      if (currentConversationId === conversationId) {
        setCurrentConversationId(updated.length > 0 ? updated[0]._id : null);
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleSend = async (text, files) => {
    if ((!text.trim() && files.length === 0) || !currentConversationId) return;

    setIsLoading(true);
    try {
      if (files.length > 0) {
        await uploadDocuments(currentConversationId, files);
      }

      if (text.trim() !== "") {
        const tempUserMessage = {
          role: "user",
          content: text,
          _id: `temp-${Date.now()}`,
        };
        setMessages((prev) => [...prev, tempUserMessage]);
        await createChatMessage(currentConversationId, text);
        await fetchConversationDetails();
      }
    } catch (error) {
      console.error("Send error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
      {/* Subheader / Mode switcher */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-raised)]/60">
        <div className="flex items-center gap-3">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              <TabsTrigger value="chat" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>AI Q&A Chat</span>
              </TabsTrigger>
              <TabsTrigger value="draft" className="flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5" />
                <span>Drafting Studio</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="text-xs text-[var(--text-muted)] hidden md:inline">
            {mode === "chat"
              ? "Query books, compliance records, and extracted invoices"
              : "Generate resolutions, audit responses, and legal agreements"}
          </span>
        </div>

        {mode === "chat" && (
          <div className="flex items-center gap-2">
            <FeatureSelector feature={feature} setFeature={handleFeatureChange} />
          </div>
        )}
      </div>

      {/* Main Studio / Chat View Area */}
      <div className="flex-1 flex overflow-hidden">
        {mode === "draft" ? (
          <div className="flex-1 overflow-hidden">
            <FinancialDraft onSwitchToChat={() => setMode("chat")} />
          </div>
        ) : (
          <div className="flex-1 flex h-full overflow-hidden">
            <Sidebar
              conversations={conversations}
              currentConversationId={currentConversationId}
              onNewChat={handleNewChat}
              onSelectChat={(id) => setCurrentConversationId(id)}
              onDeleteChat={handleDeleteChat}
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              onOpenDraftStudio={() => {
                setMode("draft");
                setFeature("Financial_Drafter");
              }}
              activeTab="chat"
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-app)]">
              {/* Header Toggle */}
              <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded-lg transition-colors cursor-pointer"
                    title="Toggle Chat History"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Ask questions about client books & documents
                  </span>
                </div>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto space-y-4">
                  {messages.length === 0 && !isLoading ? (
                    <WelcomeScreen
                      feature={feature}
                      onExampleClick={(text) => setInput(text)}
                      onFeatureSelect={handleFeatureChange}
                    />
                  ) : (
                    <>
                      {messages.map((msg) => (
                        <Message
                          key={msg._id}
                          message={msg}
                          documents={currentConversationDocs}
                        />
                      ))}
                      {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-3">
                          <Bot className="w-4 h-4 text-[var(--primary)] animate-pulse" />
                          <span>Analyzing client books and documents...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
                <div className="max-w-4xl mx-auto">
                  <ChatInput
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

