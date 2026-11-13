/** @format */

import React, { useState } from "react";
import { CheckCircle2, Sparkles, ExternalLink } from "lucide-react";
import Badge from "../ui/Badge";
import BrowserFrame from "./frames/BrowserFrame";
import MockReviewQueue from "./frames/mockups/MockReviewQueue";
import MockDashboard from "./frames/mockups/MockDashboard";
import MockGstrRecon from "./frames/mockups/MockGstrRecon";
import MockVouchers from "./frames/mockups/MockVouchers";
import { LANDING_CONTENT } from "../../content/landing";
import { cn } from "../../lib/utils";

export const ShowcaseGallery = () => {
  const { showcase } = LANDING_CONTENT;
  const [activeTabId, setActiveTabId] = useState(showcase.tabs[0].id);

  const activeTab =
    showcase.tabs.find((t) => t.id === activeTabId) || showcase.tabs[0];

  const renderMockup = (id) => {
    switch (id) {
      case "review":
        return <MockReviewQueue />;
      case "inbox":
        return <MockDashboard />;
      case "vouchers":
        return <MockVouchers />;
      case "recon":
        return <MockGstrRecon />;
      case "compliance":
        return <MockReviewQueue />;
      default:
        return <MockReviewQueue />;
    }
  };

  const getUrl = (id) => {
    switch (id) {
      case "review":
        return "app.cksfinbot.in/app/review";
      case "inbox":
        return "app.cksfinbot.in/app/inbox";
      case "vouchers":
        return "app.cksfinbot.in/app/vouchers";
      case "recon":
        return "app.cksfinbot.in/app/reconciliation";
      case "compliance":
        return "app.cksfinbot.in/app/compliance";
      default:
        return "app.cksfinbot.in/app/dashboard";
    }
  };

  return (
    <section id="showcase" className="py-16 md:py-24 bg-[var(--surface-raised)]/40 border-y border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-2">
            Interactive Product Tour
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {showcase.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {showcase.subtitle}
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-3 mb-8 gap-2 no-scrollbar">
          {showcase.tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-teal-900/20"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Showcase Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column (5 Cols): Feature Descriptions */}
          <div className="lg:col-span-4 space-y-4">
            <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300">
              {activeTab.badge}
            </Badge>

            <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              {activeTab.title}
            </h3>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {activeTab.description}
            </p>

            <div className="pt-3 space-y-2.5">
              {activeTab.highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (8 Cols): Mockup in Browser Frame */}
          <div className="lg:col-span-8">
            <BrowserFrame
              url={getUrl(activeTab.id)}
              title={`CKsFinBot • ${activeTab.title}`}
              className="shadow-2xl"
            >
              {renderMockup(activeTab.id)}
            </BrowserFrame>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowcaseGallery;

