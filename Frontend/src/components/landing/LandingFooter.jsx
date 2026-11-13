/** @format */

import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Heart } from "lucide-react";

export const LandingFooter = () => {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Info (2 cols on large) */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
                CKsFin<span className="text-[var(--primary)]">Bot</span>
              </span>
            </Link>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
              The AI document-to-books operating system for Chartered Accountants and growing Indian SMBs. Automated line-item extraction, Section 43B(h) MSME alerts, GSTR-2B reconciliation, and 1-click Tally Prime XML export.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                All Extraction & Recon Systems Operational
              </span>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
              Product Tour
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#how-it-works" className="hover:text-[var(--primary)] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-[var(--primary)] transition-colors">
                  AI Review Queue
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-[var(--primary)] transition-colors">
                  Balanced Vouchers
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-[var(--primary)] transition-colors">
                  GSTR-2B Recon
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[var(--primary)] transition-colors">
                  Tally Prime XML Export
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
              Solutions
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#audiences" className="hover:text-[var(--primary)] transition-colors">
                  For CA Practitioners
                </a>
              </li>
              <li>
                <a href="#audiences" className="hover:text-[var(--primary)] transition-colors">
                  For SMB Founders
                </a>
              </li>
              <li>
                <a href="#roi-calculator" className="hover:text-[var(--primary)] transition-colors">
                  Time Savings Estimator
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[var(--primary)] transition-colors">
                  Plans & Pricing
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-[var(--primary)] transition-colors">
                  Client Portal Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Compliance & Security */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
              Compliance & Data
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#security" className="hover:text-[var(--primary)] transition-colors">
                  Indian Data Residency
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[var(--primary)] transition-colors">
                  Section 43B(h) MSME Guide
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[var(--primary)] transition-colors">
                  Multi-Tenant Cryptography
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[var(--primary)] transition-colors">
                  Security FAQs
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} CKsFinBot Enterprise. Built for Indian Accounting & Tax Compliance.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-[var(--text-primary)] transition-colors">
              Sign In
            </Link>
            <span>•</span>
            <Link to="/signup" className="hover:text-[var(--text-primary)] transition-colors">
              Create Account
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              TLS 1.3 Encrypted
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;

