/** @format */

import React from "react";
import {
  PlusCircle,
  MessageSquare,
  FileText,
  X,
  Trash2,
  Edit3,
} from "lucide-react";

const Sidebar = ({
  conversations,
  currentConversationId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isOpen,
  setIsOpen,
  onOpenDraftStudio,
  activeTab,
}) => {
  return (
    <div
      className={`
        bg-[#0a0f1d] border-r border-gray-800 
        flex flex-col h-full z-30 fixed md:relative 
        transform transition-all duration-200 ease-in-out
        w-64
        ${isOpen ? "translate-x-0 md:w-64" : "-translate-x-full md:w-0"}
      `}
    >
      <div className="flex flex-col h-full overflow-hidden w-full">
        {/* Header Actions */}
        <div className="p-3 border-b border-gray-800 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) setIsOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 md:hidden text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              if (onOpenDraftStudio) onOpenDraftStudio();
              if (window.innerWidth < 768) setIsOpen(false);
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              activeTab === "draft"
                ? "bg-blue-950/60 text-blue-300 border-blue-500/50"
                : "bg-gray-900/60 text-gray-300 hover:text-white hover:bg-gray-900 border-gray-800"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Document Studio</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Recent Conversations & Drafts
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1 p-2">
          {conversations.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-6">
              No conversations yet
            </p>
          ) : (
            conversations.map((convo) => {
              const isDraft =
                convo.featureUsed === "Financial_Drafter" ||
                convo.featureUsed === "Document_Drafter" ||
                convo.featureUsed === "Legal_Drafter";
              const isSelected = convo._id === currentConversationId;

              return (
                <div key={convo._id} className="group relative">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectChat(convo._id);
                      if (window.innerWidth < 768) setIsOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-colors w-full ${
                      isSelected
                        ? "bg-gray-800 text-white font-medium border border-gray-700"
                        : "text-gray-300 hover:bg-gray-900 hover:text-white"
                    }`}
                  >
                    {isDraft ? (
                      <FileText className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                    )}
                    <span className="truncate flex-1">{convo.title}</span>
                  </a>
                  <button
                    onClick={() => onDeleteChat(convo._id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
