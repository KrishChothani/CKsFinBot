/** @format */

// src/JSX/Components/Sidebar.jsx
/** @format */

import {
  PlusCircle,
  MessageSquare,
  PanelLeftClose,
  X,
  Trash2,
} from "lucide-react";

const Sidebar = ({
  conversations,
  currentConversationId, // Renamed for clarity
  onNewChat,
  onSelectChat,
  onDeleteChat, // New prop
  isOpen,
  setIsOpen,
}) => {
  return (
    <div
      className={`
        bg-gray-950/80 backdrop-blur-xl border-r border-gray-800/50 
        flex flex-col h-full z-30 fixed md:relative 
        transform transition-transform duration-300 ease-in-out
        w-64
        ${isOpen ? "translate-x-0 md:w-64" : "-translate-x-full md:w-0"}
      `}
    >
      <div className={`flex flex-col h-full overflow-hidden w-full`}>
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-800/50 flex-shrink-0">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) setIsOpen(false);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="truncate">New Chat</span>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="ml-2 p-2 md:hidden text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation List */}
        <nav className="flex-1 overflow-y-auto mt-2 space-y-1 p-2">
          {conversations.map((convo) => (
            <div key={convo._id} className="group relative">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectChat(convo._id);
                  if (window.innerWidth < 768) setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors w-full ${
                  convo._id === currentConversationId
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1">{convo.title}</span>
              </a>
              <button
                onClick={() => onDeleteChat(convo._id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
