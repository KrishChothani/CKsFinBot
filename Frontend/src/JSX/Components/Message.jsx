/** @format */

import React, { useMemo } from "react";
import { Bot, User, Clipboard, CheckCircle2, AlertTriangle, LoaderCircle, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Helper component for the status badge
const StatusBadge = ({ status }) => {
  const statusConfig = {
    processing: {
      icon: <LoaderCircle className="w-3 h-3 animate-spin" />,
      text: "Processing",
      color: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    },
    processed: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      text: "Completed",
      color: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    },
    failed: {
      icon: <AlertTriangle className="w-3 h-3" />,
      text: "Failed",
      color: "bg-red-500/20 text-red-300 border border-red-500/30",
    },
  };

  const config = statusConfig[status] || statusConfig.processing;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}
    >
      {config.icon}
      {config.text}
    </span>
  );
};

// Main Message Component
const Message = ({ message, documents = [] }) => {
  const isUser = message.role === "user";

  const fileInfo = useMemo(() => {
    if (message.role === "system" && message.content.startsWith("File uploaded:")) {
      const fileNameMatch = message.content.match(/File uploaded: (.*?)\. Processing/);
      if (fileNameMatch && fileNameMatch[1]) {
        const fileName = fileNameMatch[1];
        const associatedDoc = documents.find((doc) => doc.fileName === fileName);
        return {
          isUploadNotice: true,
          fileName: fileName,
          document: associatedDoc,
        };
      }
    }
    return { isUploadNotice: false };
  }, [message, documents]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div
        className={`group relative px-4 py-3 rounded-2xl max-w-xl lg:max-w-3xl transition-colors ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none shadow-sm"
            : "bg-gray-900 border border-gray-800 text-gray-100 rounded-bl-none shadow-sm"
        }`}
      >
        <div className="prose prose-invert prose-sm md:prose-base max-w-none">
          {fileInfo.isUploadNotice ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-white">{`File: ${fileInfo.fileName}`}</p>
              <StatusBadge status={fileInfo.document?.status} />
              {fileInfo.document?.status === "failed" && fileInfo.document.errorMessage && (
                <p className="text-xs text-red-400 mt-1">Error: {fileInfo.document.errorMessage}</p>
              )}
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ node, ...props }) => (
                  <pre className="bg-gray-950 p-3 rounded-lg border border-gray-800" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse border border-gray-700 text-xs text-left" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="border border-gray-700 bg-gray-800/80 px-3 py-1.5 font-bold text-white" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-gray-700 px-3 py-1.5 text-gray-200" {...props} />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}

          {/* Citations / Referenced Document Sources */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-gray-800 not-prose">
              <div className="text-[11px] font-semibold text-blue-400 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Sources & Citations:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.citations.map((c) => (
                  <div
                    key={c.index}
                    className="text-[10px] bg-gray-950 border border-gray-700 px-2 py-0.5 rounded-md text-gray-300 flex items-center gap-1.5 shadow-sm"
                    title={c.snippet || c.fileName}
                  >
                    <span className="font-bold text-blue-400">[{c.index}]</span>
                    <span className="max-w-[160px] truncate">{c.fileName || c.title}</span>
                    {c.pageNumber && <span className="text-gray-400">(p. {c.pageNumber})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!fileInfo.isUploadNotice && (
          <button
            onClick={handleCopy}
            className="absolute -top-2 -right-2 p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy message"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default Message;
