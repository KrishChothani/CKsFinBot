/** @format */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  FileText,
  Sparkles,
  ArrowRight,
  Eye,
  BookOpen,
} from "lucide-react";
import rawTemplates from "../../data/financial_drafts_metadata.json";

const FinancialDraftsBrowser = ({ onClose, onUseTemplate, onModify }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(rawTemplates.map((t) => t.category))];
    return ["All", ...cats];
  }, []);

  const filteredTemplates = useMemo(() => {
    return rawTemplates.filter((template) => {
      const matchesCategory =
        selectedCategory === "All" || template.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        (template.tags && template.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-[#0d1424] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0a0f1d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Financial Document Template Library
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {rawTemplates.length} Templates
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Browse audit-ready statements, valuation models, MD&A disclosures, and board resolutions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-800 bg-gray-900/40 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by title, accounting standard (GAAP/IFRS), or topic..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-300 font-medium">No financial templates found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Try adjusting your search query or selecting a different category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => {
                  const isSelected = previewTemplate?.id === template.id;
                  return (
                    <div
                      key={template.id}
                      className={`group flex flex-col justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-950/30 border-blue-500"
                          : "bg-gray-900/60 hover:bg-gray-900 border-gray-800 hover:border-gray-700"
                      }`}
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {template.category}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTemplate(template);
                            }}
                            className="text-gray-400 hover:text-blue-400 transition-colors p-1"
                            title="Preview template"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                          {template.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {template.tags?.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onModify(template);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 rounded-lg transition-colors"
                            title="Attach as template chip and customize with AI prompt"
                          >
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            <span>Modify with AI</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUseTemplate(template.content, template.title);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
                            title="Insert directly into editor"
                          >
                            <span>Use</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Preview Pane */}
          {previewTemplate && (
            <div className="w-96 border-l border-gray-800 bg-[#0a0f1d] p-4 flex flex-col justify-between overflow-hidden">
              <div className="overflow-y-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400">
                    {previewTemplate.category}
                  </span>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-base font-bold text-white">{previewTemplate.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {previewTemplate.description}
                </p>

                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-gray-300 mb-1">Preview Snippet:</h4>
                  <pre className="text-[11px] p-3 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {previewTemplate.content.slice(0, 500)}...
                  </pre>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex items-center gap-2">
                <button
                  onClick={() => {
                    onModify(previewTemplate);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-blue-300 bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 rounded-xl transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Modify with AI</span>
                </button>
                <button
                  onClick={() => {
                    onUseTemplate(previewTemplate.content, previewTemplate.title);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialDraftsBrowser;
