/** @format */

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2pdf from "html2pdf.js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import {
  Sparkles,
  Download,
  BookOpen,
  History,
  Check,
  X,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Copy,
  FileDown,
  ChevronDown,
  Edit3,
  Eye,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Table as TableIcon,
  Eraser,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  getAllConversations,
  getConversationById,
  createConversation,
  createChatMessage,
  updateDraftContent,
  suggestImprovement,
} from "../../services/apiClient";
import FinancialDraftsBrowser from "./FinancialDraftsBrowser";

// ─── MARKDOWN & HTML CONVERTERS (MatterAssist Bidirectional Architecture) ────

const convertMarkdownToHtml = (markdown) => {
  if (!markdown) return "";
  let html = markdown;

  // Handle tables first
  const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)*)/g;
  html = html.replace(tableRegex, (match, header, rows) => {
    const headerCells = header
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell);
    const rowsArray = rows
      .trim()
      .split("\n")
      .map((row) =>
        row
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell)
      );

    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid #d1d5db;">';
    tableHtml += "<thead><tr>";
    headerCells.forEach((cell) => {
      tableHtml += `<th style="border:1px solid #d1d5db; padding:8px 12px; background-color:#f3f4f6; color:#111827; font-weight:600; text-align:left;">${cell}</th>`;
    });
    tableHtml += "</tr></thead><tbody>";
    rowsArray.forEach((row) => {
      tableHtml += "<tr>";
      row.forEach((cell) => {
        tableHtml += `<td style="border:1px solid #d1d5db; padding:8px 12px; color:#1f2937;">${cell}</td>`;
      });
      tableHtml += "</tr>";
    });
    tableHtml += "</tbody></table>";
    return tableHtml;
  });

  // Handle standard markdown formatting
  html = html
    .replace(/^### (.*$)/gim, '<h3 style="font-size:1.15rem; font-weight:bold; margin:16px 0 8px 0; color:#111827;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:1.35rem; font-weight:bold; margin:20px 0 10px 0; color:#111827;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size:1.6rem; font-weight:bold; margin:24px 0 12px 0; color:#111827;">$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/~~(.*?)~~/gim, "<del>$1</del>")
    .replace(/`(.*?)`/gim, '<code style="background-color:#f3f4f6; padding:2px 4px; border-radius:4px; font-family:monospace; font-size:0.9em;">$1</code>')
    .replace(/^\> (.*$)/gim, '<blockquote style="border-left:4px solid #2563eb; padding-left:12px; margin:12px 0; color:#4b5563; background:#eff6ff; padding:8px 12px;">$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li style="margin-left:20px; list-style-type:disc;">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li style="margin-left:20px; list-style-type:decimal;">$1</li>')
    .replace(/\n\n/gim, "<p><br></p>")
    .replace(/\n/gim, "<br>");

  return html;
};

const convertHtmlToMarkdown = (html) => {
  if (!html) return "";
  let markdown = html
    // Handle tables
    .replace(/<table[^>]*>(.*?)<\/table>/gis, (match, tableContent) => {
      let tableMarkdown = "\n";
      const rows = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gis) || [];
      rows.forEach((row, index) => {
        const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis) || [];
        const cellTexts = cells.map((cell) => cell.replace(/<[^>]+>/g, "").trim());
        if (cellTexts.length > 0) {
          tableMarkdown += "| " + cellTexts.join(" | ") + " |\n";
          if (index === 0) {
            tableMarkdown += "| " + cellTexts.map(() => "---").join(" | ") + " |\n";
          }
        }
      });
      return tableMarkdown + "\n";
    })
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<strong><em>(.*?)<\/em><\/strong>/gi, "***$1***")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<u[^>]*>(.*?)<\/u>/gi, "$1")
    .replace(/<del[^>]*>(.*?)<\/del>/gi, "~~$1~~")
    .replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "\n> $1\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div[^>]*>(.*?)<\/div>/gi, "$1\n");

  return markdown.replace(/\n{3,}/g, "\n\n").trim();
};

// ─── RICH TEXT TOOLBAR (Active in Edit Mode) ──────────────────────────────────

const EditorToolbar = ({ editorRef, onFormat }) => {
  const [activeFormats, setActiveFormats] = useState({});

  const checkActiveFormats = useCallback(() => {
    if (!editorRef.current) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyFull: document.queryCommandState("justifyFull"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      });
    } catch {
      // Ignored if document doesn't support queryCommandState in certain context
    }
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", checkActiveFormats);
    return () => document.removeEventListener("selectionchange", checkActiveFormats);
  }, [checkActiveFormats]);

  const execCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    checkActiveFormats();
    onFormat?.();
  };

  const insertTable = () => {
    const rows = prompt("Number of rows (including header):", "4");
    const cols = prompt("Number of columns:", "4");
    if (!rows || !cols) return;
    const numRows = parseInt(rows, 10);
    const numCols = parseInt(cols, 10);
    if (isNaN(numRows) || isNaN(numCols) || numRows <= 0 || numCols <= 0) return;

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #d1d5db;"><thead><tr>`;
    for (let c = 0; c < numCols; c++) {
      tableHtml += `<th style="border: 1px solid #d1d5db; padding: 8px 12px; background-color: #f3f4f6; color: #111827; font-weight: 600; text-align: left;">Col ${c + 1}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 0; r < numRows - 1; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < numCols; c++) {
        tableHtml += `<td style="border: 1px solid #d1d5db; padding: 8px 12px; color: #1f2937;">$0.00</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;
    execCommand("insertHTML", tableHtml);
  };

  const ToolBtn = ({ onClick, active, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-300 hover:text-white hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-800 bg-[#0d1424] sticky top-0 z-20">
      <div className="flex items-center gap-0.5 pr-2 border-r border-gray-800">
        <ToolBtn onClick={() => execCommand("undo")} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("redo")} title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </ToolBtn>
      </div>

      <div className="flex items-center gap-0.5 px-2 border-r border-gray-800">
        <select
          onChange={(e) => execCommand("formatBlock", e.target.value)}
          defaultValue="p"
          className="bg-gray-900 border border-gray-700 text-xs text-gray-200 rounded-md px-2.5 py-1 focus:outline-none focus:border-blue-500"
        >
          <option value="p">Normal Text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      <div className="flex items-center gap-0.5 px-2 border-r border-gray-800">
        <ToolBtn onClick={() => execCommand("bold")} active={activeFormats.bold} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("italic")} active={activeFormats.italic} title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("underline")} active={activeFormats.underline} title="Underline (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("strikeThrough")} active={activeFormats.strikeThrough} title="Strikethrough">
          <Strikethrough className="w-4 h-4" />
        </ToolBtn>
      </div>

      <div className="flex items-center gap-0.5 px-2 border-r border-gray-800">
        <ToolBtn onClick={() => execCommand("justifyLeft")} active={activeFormats.justifyLeft} title="Align Left">
          <AlignLeft className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("justifyCenter")} active={activeFormats.justifyCenter} title="Align Center">
          <AlignCenter className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("justifyRight")} active={activeFormats.justifyRight} title="Align Right">
          <AlignRight className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("justifyFull")} active={activeFormats.justifyFull} title="Justify">
          <AlignJustify className="w-4 h-4" />
        </ToolBtn>
      </div>

      <div className="flex items-center gap-0.5 px-2 border-r border-gray-800">
        <ToolBtn onClick={() => execCommand("insertUnorderedList")} active={activeFormats.insertUnorderedList} title="Bullet List">
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("insertOrderedList")} active={activeFormats.insertOrderedList} title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("indent")} title="Indent">
          <Indent className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("outdent")} title="Outdent">
          <Outdent className="w-4 h-4" />
        </ToolBtn>
      </div>

      <div className="flex items-center gap-0.5 pl-2">
        <ToolBtn onClick={insertTable} title="Insert Financial Table">
          <TableIcon className="w-4 h-4 text-blue-400" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("removeFormat")} title="Clear Formatting">
          <Eraser className="w-4 h-4 text-gray-400" />
        </ToolBtn>
      </div>
    </div>
  );
};

// ─── MAIN DRAFTING STUDIO COMPONENT ──────────────────────────────────────────

const FinancialDraft = ({ onSwitchToChat }) => {
  // Main states
  const [query, setQuery] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [error, setError] = useState(null);

  // MatterAssist Mode Toggle: Edit Mode vs. Preview Mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Canvas View Controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drafts & Version History
  const [serverDrafts, setServerDrafts] = useState([]);
  const [draftVersions, setDraftVersions] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showDraftsBrowser, setShowDraftsBrowser] = useState(false);
  const [templateAttachment, setTemplateAttachment] = useState(null); // { title, content }

  // Selection & AI Suggestion States
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState(null);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [floatingPos, setFloatingPos] = useState({ x: 0, y: 0 });
  const [suggestedText, setSuggestedText] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");

  // Refs
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const lastSavedHtmlRef = useRef("");

  // ─── LOAD SERVER DRAFTS ─────────────────────────────────────────────────────

  const fetchServerDrafts = useCallback(async () => {
    try {
      const response = await getAllConversations();
      if (response.data?.data) {
        const drafts = response.data.data.filter(
          (c) =>
            c.featureUsed === "Financial_Drafter" ||
            c.featureUsed === "Document_Drafter" ||
            c.featureUsed === "Legal_Drafter"
        );
        setServerDrafts(drafts);
      }
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    }
  }, []);

  useEffect(() => {
    fetchServerDrafts();
  }, [fetchServerDrafts]);

  // ─── FETCH VERSIONS FOR CONVERSATION ────────────────────────────────────────

  const fetchVersions = async (convId) => {
    try {
      const response = await getConversationById(convId);
      if (response.data?.data) {
        const { messages } = response.data.data;
        const versions = messages
          .filter((m) => m.role === "assistant")
          .map((m, idx) => ({
            id: m._id || idx,
            content: m.content,
            timestamp: m.createdAt,
            versionNumber: idx + 1,
          }));
        setDraftVersions(versions);
        return versions;
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err);
    }
    return [];
  };

  const loadDraft = async (draft) => {
    setCurrentConversationId(draft._id);
    const versions = await fetchVersions(draft._id);
    if (versions.length > 0) {
      const latest = versions[versions.length - 1];
      setDraftContent(latest.content);
      if (isEditMode && editorRef.current) {
        editorRef.current.innerHTML = convertMarkdownToHtml(latest.content);
      }
      setLastQuery(draft.title);
    }
  };

  // ─── SYNC MODE SWITCH (MatterAssist Edit / Preview Switch Pattern) ──────────

  useEffect(() => {
    if (isEditMode && editorRef.current) {
      const html = convertMarkdownToHtml(draftContent);
      editorRef.current.innerHTML = html;
      editorRef.current.focus();
    }
  }, [isEditMode]);

  // ─── SYNC EDITOR HTML ────────────────────────────────────────────────────────

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const markdown = convertHtmlToMarkdown(html);
    setDraftContent(markdown);
  };

  // ─── SAVE EDITS TO BACKEND ───────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!currentConversationId || !draftContent) return;
    try {
      await updateDraftContent(currentConversationId, draftContent);
      lastSavedHtmlRef.current = draftContent;
      fetchVersions(currentConversationId);
    } catch (err) {
      console.error("Error saving draft version:", err);
    }
  };

  // ─── GENERATE DRAFT WITH AI ─────────────────────────────────────────────────

  const handleGenerateDraft = async (overridePrompt = null) => {
    const promptText = overridePrompt || query;
    if (!promptText.trim()) return;

    setIsLoading(true);
    setError(null);

    let effectivePrompt = promptText.trim();
    if (templateAttachment) {
      effectivePrompt = `[BASE TEMPLATE: ${templateAttachment.title}]\n${templateAttachment.content}\n\n[USER INSTRUCTIONS & CUSTOMIZATION]:\n${effectivePrompt}`;
    }

    try {
      let convId = currentConversationId;
      if (!convId) {
        const titleSnippet = promptText.slice(0, 40);
        const convRes = await createConversation(
          `Draft: ${titleSnippet}...`,
          "Financial_Drafter"
        );
        convId = convRes.data.data._id;
        setCurrentConversationId(convId);
      }

      const msgRes = await createChatMessage(convId, effectivePrompt);
      const generatedAnswer = msgRes.data.data.content;

      setDraftContent(generatedAnswer);
      if (isEditMode && editorRef.current) {
        editorRef.current.innerHTML = convertMarkdownToHtml(generatedAnswer);
      }
      setLastQuery(promptText);
      setQuery("");
      setTemplateAttachment(null);

      // Refresh drafts list and versions
      fetchServerDrafts();
      fetchVersions(convId);
    } catch (err) {
      console.error("Failed to generate draft:", err);
      setError(
        err.response?.data?.message ||
          "Failed to generate draft. Please ensure the Python backend is active."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ─── TEXT SELECTION LISTENER FOR INLINE AI SUGGESTIONS ─────────────────────

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setShowFloatingButton(false);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 5) {
      setShowFloatingButton(false);
      return;
    }

    const range = sel.getRangeAt(0);
    const container = isEditMode ? editorRef.current : previewRef.current;

    if (container && container.contains(range.commonAncestorContainer)) {
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionRange(range.cloneRange());
      setFloatingPos({
        x: Math.max(10, rect.left + rect.width / 2 - 80),
        y: Math.max(10, rect.top - 46),
      });
      setShowFloatingButton(true);
    }
  }, [isEditMode]);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [handleSelection]);

  // ─── INLINE AI IMPROVEMENT TRIGGER ──────────────────────────────────────────

  const requestImprovement = async (instructionPreset = "") => {
    if (!selectedText) return;
    setIsSuggesting(true);
    setShowFloatingButton(false);
    setShowSuggestionModal(true);
    setError(null);

    const docContext = draftContent;
    const instruction =
      instructionPreset ||
      customInstruction ||
      "Elevate to formal CFO executive quality and precision.";

    try {
      const res = await suggestImprovement(selectedText, docContext, instruction);
      setSuggestedText(res.data.data.suggestion);
    } catch (err) {
      console.error("Suggestion error:", err);
      setSuggestedText("Failed to generate suggestion. Please try again.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const applyReplacement = () => {
    if (!suggestedText || !selectedText) return;
    try {
      const trimmedSelected = selectedText.trim();
      const trimmedSuggestion = suggestedText.trim();

      let newContent = draftContent;
      if (draftContent.includes(trimmedSelected)) {
        newContent = draftContent.replace(trimmedSelected, trimmedSuggestion);
      } else {
        const escapedSelected = trimmedSelected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const flexibleRegex = new RegExp(escapedSelected.split(/\s+/).join("\\s*"), "i");
        if (flexibleRegex.test(draftContent)) {
          newContent = draftContent.replace(flexibleRegex, trimmedSuggestion);
        }
      }

      setDraftContent(newContent);
      if (isEditMode && editorRef.current) {
        editorRef.current.innerHTML = convertMarkdownToHtml(newContent);
      }

      setShowSuggestionModal(false);
      setSelectedText("");
      setSuggestedText("");
      setShowFloatingButton(false);

      if (currentConversationId) {
        updateDraftContent(currentConversationId, newContent);
      }
    } catch (err) {
      console.error("Replacement error:", err);
    }
  };

  const applyInsertBelow = () => {
    if (!suggestedText || !selectedText) return;
    try {
      const trimmedSelected = selectedText.trim();
      const trimmedSuggestion = suggestedText.trim();
      const insertion = `${trimmedSelected}\n\n${trimmedSuggestion}`;

      let newContent = draftContent;
      if (draftContent.includes(trimmedSelected)) {
        newContent = draftContent.replace(trimmedSelected, insertion);
      }

      setDraftContent(newContent);
      if (isEditMode && editorRef.current) {
        editorRef.current.innerHTML = convertMarkdownToHtml(newContent);
      }

      setShowSuggestionModal(false);
      setSelectedText("");
      setSuggestedText("");
      setShowFloatingButton(false);

      if (currentConversationId) {
        updateDraftContent(currentConversationId, newContent);
      }
    } catch (err) {
      console.error("Insert below error:", err);
    }
  };

  // ─── EXPORT: PDF ─────────────────────────────────────────────────────────────

  const handleDownloadPdf = () => {
    const targetElement = isEditMode ? editorRef.current : previewRef.current;
    if (!targetElement) return;

    const opt = {
      margin: [15, 15, 15, 15],
      filename: `Financial_Report_${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(targetElement).save();
  };

  // ─── EXPORT: WORD (.DOCX) ───────────────────────────────────────────────────

  const handleDownloadDocx = async () => {
    const text = draftContent || (editorRef.current?.innerText || "");
    const lines = text.split("\n");

    const paragraphs = lines.map((line) => {
      if (line.startsWith("# ")) {
        return new Paragraph({
          text: line.replace("# ", ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        });
      } else if (line.startsWith("## ")) {
        return new Paragraph({
          text: line.replace("## ", ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        });
      } else if (line.startsWith("### ")) {
        return new Paragraph({
          text: line.replace("### ", ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        });
      } else {
        return new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 120 },
        });
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Financial_Report_${Date.now()}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Statistics calculation
  const wordCount = (draftContent || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const charCount = (draftContent || "").length;

  return (
    <div
      className={`flex flex-col h-screen bg-[#070b14] text-white overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* ─── TOP STUDIO HEADER BAR (MatterAssist White & Blue Style) ─── */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-[#0a0f1d] border-b border-gray-800 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Financial Document Drafter
              </h1>
              <p className="text-[11px] text-gray-400">
                Audit-Ready Statements, MD&A, and Corporate Disclosures
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-800">
            {/* Template Library Button */}
            <button
              onClick={() => setShowDraftsBrowser(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-300 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/60 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Templates</span>
            </button>

            {serverDrafts.length > 0 && (
              <select
                value={currentConversationId || ""}
                onChange={(e) => {
                  const draft = serverDrafts.find((d) => d._id === e.target.value);
                  if (draft) loadDraft(draft);
                }}
                className="bg-gray-900 border border-gray-700 text-xs text-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 max-w-[190px] truncate"
              >
                <option value="" disabled>
                  Load Saved Draft...
                </option>
                {serverDrafts.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}

            {currentConversationId && (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors"
                title="Version History"
              >
                <History className="w-3.5 h-3.5" />
                <span>Versions ({draftVersions.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── CENTER: PREVIEW vs EDIT MODE TOGGLE (Direct MatterAssist Replication) ─── */}
        <div className="flex items-center bg-gray-900 border border-gray-700 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setIsEditMode(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              !isEditMode
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
            title="Preview formatted document with Markdown rendering"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditMode(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isEditMode
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
            title="Edit document with formatting toolbar"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Mode</span>
          </button>
        </div>

        {/* ─── RIGHT ACTIONS: Zoom, Fullscreen, Export, Switch to Chat ─── */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center bg-gray-900 border border-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, +(z - 0.1).toFixed(1)))}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-gray-300 px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, +(z + 0.1).toFixed(1)))}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-white bg-gray-900 border border-gray-700 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
              <button
                onClick={handleDownloadPdf}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <FileDown className="w-4 h-4 text-red-400" />
                <span>Export as PDF</span>
              </button>
              <button
                onClick={handleDownloadDocx}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Export as Word (.docx)</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(draftContent);
                  alert("Copied document text to clipboard!");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>Copy to Clipboard</span>
              </button>
            </div>
          </div>

          {/* Back to Chat Button */}
          {onSwitchToChat && (
            <button
              onClick={onSwitchToChat}
              className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors"
            >
              Switch to Chat
            </button>
          )}
        </div>
      </header>

      {/* Editor Toolbar (Only visible in Edit Mode) */}
      {isEditMode && <EditorToolbar editorRef={editorRef} onFormat={handleEditorInput} />}

      {/* ─── MAIN DESK CANVAS (Neutral Desk Background + A4 Paper Page) ─── */}
      <div
        ref={canvasContainerRef}
        className="flex-1 overflow-y-auto bg-[#060a14] p-4 sm:p-8 flex justify-center relative select-text"
      >
        {/* Floating AI Assistant Action on Selection */}
        {showFloatingButton && (
          <div
            style={{
              position: "fixed",
              left: `${floatingPos.x}px`,
              top: `${floatingPos.y}px`,
              zIndex: 40,
            }}
            className="flex items-center gap-1.5 p-1 bg-gray-900 border border-blue-500 rounded-xl shadow-2xl"
          >
            <button
              onClick={() => requestImprovement("Elevate to formal CFO executive quality and precision.")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CFO Polish</span>
            </button>
            <button
              onClick={() => requestImprovement("Verify GAAP/IFRS terminology and standard presentation.")}
              className="px-2 py-1 text-xs text-gray-200 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              GAAP Check
            </button>
            <button
              onClick={() => requestImprovement("Summarize this section into a high-level executive takeaway bullet.")}
              className="px-2 py-1 text-xs text-gray-200 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              Summarize
            </button>
          </div>
        )}

        {/* ─── A4 PAPER SIMULATED CONTAINER (Split Side-by-Side on lg+, Tabbed on mobile) ─── */}
        <div className="w-full flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* EDITOR PANE */}
          <div
            className={`w-full lg:flex-1 max-w-full overflow-hidden ${
              !isEditMode ? "hidden lg:block" : "block"
            }`}
          >
            <div className="mb-2 flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Edit3 className="w-3.5 h-3.5" /> Document Editor
              </span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">Rich text editable</span>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onBlur={handleSaveDraft}
              className="w-full mx-auto bg-white text-gray-900 shadow-xl rounded-lg border border-gray-300 outline-none p-6 sm:p-8 min-h-[500px] lg:min-h-[700px] text-sm leading-relaxed"
              style={{
                fontFamily: '"Times New Roman", Times, Georgia, serif',
                fontSize: "12pt",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
              }}
            />
          </div>

          {/* PREVIEW PANE (A4 Simulated Preview) */}
          <div
            className={`w-full lg:flex-1 max-w-full overflow-hidden ${
              isEditMode ? "hidden lg:block" : "block"
            }`}
          >
            <div className="mb-2 flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Eye className="w-3.5 h-3.5" /> A4 Document Preview
              </span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">Print / Export replica</span>
            </div>
            <div className="w-full overflow-hidden rounded-lg shadow-xl border border-gray-300 bg-white">
              <div
                ref={previewRef}
                className="w-full p-6 sm:p-8 text-gray-900 prose max-w-none text-sm leading-relaxed min-h-[500px] lg:min-h-[700px]
                  [&_strong]:font-bold [&_em]:italic
                  [&_p]:mb-3 [&_p]:text-gray-900 [&_p]:leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
                  [&_li]:text-gray-900
                  [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900 [&_h1]:mt-4
                  [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-gray-900 [&_h2]:mt-3
                  [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-gray-900 [&_h3]:mt-2
                  [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-gray-800
                  [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_table]:w-full [&_table]:mb-3 [&_table]:text-xs
                  [&_th]:border [&_th]:border-gray-300 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:bg-gray-100 [&_th]:font-bold [&_th]:text-left [&_th]:text-gray-900
                  [&_td]:border [&_td]:border-gray-300 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-gray-800"
                style={{
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  fontSize: "11pt",
                  lineHeight: "1.5",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {draftContent ||
                    "# Financial Document Draft\n\n*No document drafted yet. Choose a template or ask CKsFinBot to draft a document below.*"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER INFO & STATUS BAR (MatterAssist Layout Bar) ─── */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-gray-800 bg-[#0a0f1d] text-xs text-gray-400 z-20">
        <div className="flex items-center gap-4">
          <span>
            Words: <strong className="text-white">{wordCount}</strong>
          </span>
          <span>
            Characters: <strong className="text-white">{charCount}</strong>
          </span>
          {currentConversationId && (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" /> Auto-saved to server
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-300">
            {isEditMode
              ? "Rich Text Editing • A4 Simulated Layout"
              : "Preview Mode • A4 Simulated Layout"}
          </span>
          {lastQuery && (
            <button
              onClick={() => handleGenerateDraft(lastQuery)}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          )}
        </div>
      </div>

      {/* ─── BOTTOM AI PROMPT BAR ─── */}
      <div className="p-3 sm:p-4 bg-[#0d1424] border-t border-gray-800 z-30">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Template Attachment Chip */}
          {templateAttachment && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-950/60 border border-blue-500/40 rounded-lg text-xs text-blue-200 w-fit">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Base Template: <strong>{templateAttachment.title}</strong>
              </span>
              <button
                onClick={() => setTemplateAttachment(null)}
                className="text-gray-400 hover:text-white ml-1 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative flex items-center">
            <textarea
              rows={2}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleGenerateDraft();
                }
              }}
              placeholder="Ask CKsFinBot to draft a document (e.g. 'Draft a Consolidated Balance Sheet & Income Statement for Q3 with YoY variance analysis and EBITDA breakdown')..."
              className="w-full pl-4 pr-36 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
            />
            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
              <button
                onClick={() => handleGenerateDraft()}
                disabled={isLoading || (!query.trim() && !templateAttachment)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Drafting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TEMPLATE BROWSER MODAL ─── */}
      {showDraftsBrowser && (
        <FinancialDraftsBrowser
          onClose={() => setShowDraftsBrowser(false)}
          onUseTemplate={(content, title) => {
            setDraftContent(content);
            if (isEditMode && editorRef.current) {
              editorRef.current.innerHTML = convertMarkdownToHtml(content);
            }
            setIsEditMode(false); // Switch to preview mode so user inspects rendered document
            handleSaveDraft();
          }}
          onModify={(tmpl) => {
            setTemplateAttachment(tmpl);
            setQuery(`Customize this ${tmpl.title} for our corporate needs...`);
          }}
        />
      )}

      {/* ─── SUGGESTION PREVIEW & DIFF MODAL ─── */}
      {showSuggestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="flex flex-col w-full max-w-2xl bg-[#0d1424] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0a0f1d]">
              <div className="flex items-center gap-2 text-blue-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">AI Text Improvement</h3>
              </div>
              <button
                onClick={() => setShowSuggestionModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Original Selected Text
                </span>
                <div className="mt-1.5 p-3 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-200 font-mono">
                  {selectedText}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Improved Financial Phrasing
                </span>
                <div className="mt-1.5 p-3.5 rounded-lg bg-blue-950/30 border border-blue-800/60 text-sm text-blue-100 leading-relaxed font-sans min-h-[80px]">
                  {isSuggesting ? (
                    <div className="flex items-center gap-2 text-xs text-blue-300">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Refining text with CFO-grade polish...</span>
                    </div>
                  ) : (
                    suggestedText
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Custom Guidance (Optional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="e.g. 'Make it more concise', 'Add YoY % comparison', 'Format as accounting note'"
                    className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => requestImprovement()}
                    disabled={isSuggesting}
                    className="px-3 py-1.5 text-xs text-blue-300 bg-blue-950/60 hover:bg-blue-900 border border-blue-700/60 rounded-lg transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-800 bg-[#0a0f1d]">
              <button
                onClick={() => setShowSuggestionModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Discard
              </button>
              <button
                onClick={applyInsertBelow}
                disabled={isSuggesting || !suggestedText}
                className="px-4 py-2 text-xs text-blue-300 bg-blue-950/60 hover:bg-blue-900 border border-blue-700/60 rounded-lg transition-colors"
              >
                Insert Below
              </button>
              <button
                onClick={applyReplacement}
                disabled={isSuggesting || !suggestedText}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
              >
                Replace Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VERSION HISTORY MODAL ─── */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="flex flex-col w-full max-w-xl bg-[#0d1424] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0a0f1d]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Draft Revisions & History</h3>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {draftVersions.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">
                  No previous versions saved for this session.
                </p>
              ) : (
                draftVersions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-semibold text-white">
                        Version {v.versionNumber}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        {v.timestamp ? new Date(v.timestamp).toLocaleString() : "Initial Draft"}
                      </p>
                      <p className="text-xs text-gray-300 line-clamp-1 mt-1 font-mono">
                        {v.content?.replace(/<[^>]+>/g, "").slice(0, 70)}...
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDraftContent(v.content);
                        if (isEditMode && editorRef.current) {
                          editorRef.current.innerHTML = convertMarkdownToHtml(v.content);
                        }
                        setShowVersionHistory(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 rounded-lg transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDraft;
