/** @format */

import React, { useRef, useState } from "react";
import { Send, LoaderCircle, Paperclip, FileText, X } from "lucide-react";

const ChatInput = ({ input, setInput, onSend, isLoading }) => {
  const fileInputRef = useRef(null);
  const [stagedFiles, setStagedFiles] = useState([]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (input.trim() !== "" || stagedFiles.length > 0)) {
        handleSendClick();
      }
    }
  };

  const onFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length > 0) {
      setStagedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
    e.target.value = null; // Reset file input
  };

  const removeFile = (fileName) => {
    setStagedFiles(stagedFiles.filter((file) => file.name !== fileName));
  };

  const handleSendClick = () => {
    if (input.trim() === "" && stagedFiles.length === 0) return;
    onSend(input, stagedFiles);
    setInput("");
    setStagedFiles([]);
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={onFileSelect}
        className="hidden"
        accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt"
      />

      {/* Staged Files Display Area */}
      {stagedFiles.length > 0 && (
        <div className="p-3 bg-gray-900 border border-b-0 border-gray-700 rounded-t-xl">
          <div className="flex flex-wrap gap-2">
            {stagedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-200"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  onClick={() => removeFile(file.name)}
                  className="p-0.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="relative flex items-center">
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={isLoading}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
          title="Attach Documents"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about financial metrics, analysis, or attach documents..."
          className={`w-full resize-none bg-gray-900 border border-gray-700 text-sm text-white py-3 pl-12 pr-16 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500 transition-colors
            ${stagedFiles.length > 0 ? "rounded-b-xl rounded-t-none" : "rounded-xl"} 
          `}
          rows={1}
        />
        <button
          onClick={handleSendClick}
          disabled={isLoading || (input.trim() === "" && stagedFiles.length === 0)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isLoading ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
