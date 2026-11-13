/** @format */

export const LANDING_CONTENT = {
  announcement: {
    badge: "New Release",
    text: "Section 43B(h) MSME 45-Day Tracker & GSTR-2B 3-Way Auto-Recon Live",
    linkText: "Explore features",
    linkHref: "#features",
  },
  hero: {
    headline: "Upload Messy Invoices & Bank Statements. Get Tally-Ready Books in Seconds.",
    subhead:
      "Purpose-built for Indian CA firms and fast-growing SMBs. CKsFinBot extracts line-items with high-fidelity OCR, auto-maps ledgers with MSME tagging, reconciles GSTR-2B, and exports clean double-entry XML vouchers directly to Tally & Busy.",
    primaryCta: {
      text: "Start Free 14-Day Trial",
      href: "/signup",
    },
    secondaryCta: {
      text: "Book CA Walkthrough",
      action: "openDemoModal",
    },
    trustBadges: [
      "No credit card required",
      "GSTIN & Section 43B(h) compliant",
      "Direct Tally Prime & Busy XML export",
    ],
  },
  integrations: {
    title: "Seamless Compatibility With Your Accounting & Banking Stack",
    subtitle: "No clunky sync plugins. Direct verified exports and portal reconciliations.",
    items: [
      {
        name: "Tally Prime & ERP 9",
        category: "Accounting ERP",
        format: "Native XML Vouchers",
        status: "Direct 1-Click Import",
      },
      {
        name: "Busy Accounting",
        category: "Accounting ERP",
        format: "XML & Excel Format",
        status: "Verified Schema",
      },
      {
        name: "GSTN Portal (GSTR-2B)",
        category: "Government Tax",
        format: "JSON & Excel",
        status: "3-Way ITC Recon",
      },
      {
        name: "Major Indian Banks",
        category: "Banking (HDFC, ICICI, SBI, Axis, Kotak)",
        format: "PDF & CSV Parser",
        status: "Auto-BRS Allocation",
      },
      {
        name: "Razorpay & Cashfree",
        category: "Payment Gateways",
        format: "Settlement Recon",
        status: "Fee & Tax Split",
      },
    ],
  },
  howItWorks: {
    title: "From Raw Document to Reconciled Ledger in 3 Steps",
    subtitle: "Automate 80% of repetitive bookkeeping without surrendering control or audit trails.",
    steps: [
      {
        step: "01",
        title: "Intake & Ingest Any Document",
        description:
          "Drop scanned PDFs, smartphone photos, multi-page PDFs, or bank statements. Clients can also upload directly via secure Magic Link portals or email intake.",
        badge: "Multi-Source Intake",
        features: ["Skewed & multi-page support", "Client magic links", "Duplicate invoice detection"],
      },
      {
        step: "02",
        title: "AI Extraction & Ledger Auto-Allocation",
        description:
          "High-precision OCR extracts vendor GSTINs, invoice numbers, line-items, HSN codes, and tax breakdowns. The AI suggests double-entry debits/credits according to your client's Chart of Accounts.",
        badge: "Smart Ledger Allocation",
        features: ["Section 43B(h) MSME detection", "HSN & CGST/SGST/IGST verification", "Confidence score indicators"],
      },
      {
        step: "03",
        title: "1-Click CA Review & ERP Sync",
        description:
          "Review extractions side-by-side with the original document. Approve, adjust with keyboard shortcuts, and export clean, balanced double-entry vouchers directly to Tally Prime or Busy.",
        badge: "Audit-Ready Export",
        features: ["Side-by-side verification", "1-Click Tally XML download", "Complete timestamped audit trail"],
      },
    ],
  },
  showcase: {
    title: "Tour the Platform Built for Modern Accounting Teams",
    subtitle: "Explore the actual workspaces, verification studio, and reconciliation engines in CKsFinBot.",
    tabs: [
      {
        id: "review",
        label: "AI Review Queue",
        title: "Side-by-Side Verification Studio",
        description:
          "Never switch between windows. Inspect the original invoice preview on the left while checking extracted line-items, tax splits, and double-entry ledger allocation on the right.",
        badge: "Human-in-the-Loop",
        highlights: [
          "Field-level confidence scoring (Green/Amber/Red)",
          "Instant Section 43B(h) MSME payment deadline tags",
          "One-click ledger re-assignment from active Chart of Accounts",
          "Balanced debit & credit preview before posting",
        ],
      },
      {
        id: "inbox",
        label: "Document Inbox",
        title: "Centralized Document Pipeline",
        description:
          "Manage all client documents across intake stages: Processing, Needs Review, Approved, and Posted to Books. Filter by vendor, date, or category with zero friction.",
        badge: "Zero Document Loss",
        highlights: [
          "Real-time OCR progress indicators",
          "Batch multi-file upload with auto-sorting",
          "Direct client upload status tracking",
          "Filter by Financial Year and Quarter",
        ],
      },
      {
        id: "vouchers",
        label: "Double-Entry Vouchers",
        title: "Tally-Ready Balanced Vouchers",
        description:
          "Every document automatically generates balanced double-entry accounting vouchers (Purchase, Sales, Payment, Receipt, Journal) adhering strictly to standard Indian accounting guidelines.",
        badge: "Double-Entry Precision",
        highlights: [
          "Pre-validated Debits = Credits checking",
          "Direct XML export formatted for Tally Prime import",
          "Automated narration with Invoice No. and GSTIN",
          "Full ledger history preservation",
        ],
      },
      {
        id: "recon",
        label: "GSTR-2B & BRS Recon",
        title: "Automated 3-Way Reconciliation",
        description:
          "Upload your monthly GSTR-2B JSON and match against purchase registers in seconds. Immediately isolate Matched ITC, Missing in Books, and Tax Amount Mismatches.",
        badge: "ITC Maximization",
        highlights: [
          "Prevent ineligible ITC loss with instant mismatch flags",
          "Bank statement BRS reconciliation against voucher payments",
          "Side-by-side tax rate difference alerts",
          "One-click vendor discrepancy memo export",
        ],
      },
      {
        id: "compliance",
        label: "Compliance & MSME",
        title: "Section 43B(h) & Statutory Calendar",
        description:
          "Keep clients compliant with the 45-day MSME payment mandate. Automated alerts warn of impending deadlines before expense disallowance strikes under Income Tax rules.",
        badge: "Statutory Shield",
        highlights: [
          "Micro & Small enterprise vendor categorization",
          "Days remaining countdown for overdue invoices",
          "Advance Tax, TDS, and GST filing deadline tracking",
          "Proactive compliance reports for clients",
        ],
      },
    ],
  },
  bento: {
    title: "Engineered Specifically for Indian Tax & Accounting Rules",
    subtitle: "Built from the ground up for how Chartered Accountants and finance heads actually work.",
    cards: [
      {
        title: "Section 43B(h) Compliance Engine",
        description:
          "Automatically identifies Micro and Small enterprise vendors from UDYAM numbers and triggers a 45-day (or 15-day) payment countdown to avert tax disallowance.",
        tag: "Income Tax Compliance",
        icon: "ShieldAlert",
      },
      {
        title: "Field-Level Confidence Scoring",
        description:
          "Every extracted field—from GSTIN to CGST/SGST/IGST breakdown—displays a color-coded OCR confidence score so you only verify flagged edge cases.",
        tag: "99%+ Accuracy Focus",
        icon: "CheckCircle2",
      },
      {
        title: "Native Tally Prime XML Export",
        description:
          "No third-party bridge required. Export standard XML vouchers ready for direct 'Import Data' into Tally Prime or ERP 9 in seconds.",
        tag: "Zero Rekeying",
        icon: "FileSpreadsheet",
      },
      {
        title: "Multi-Client Isolated Workspaces",
        description:
          "Firm partners and staff can switch seamlessly between dozens of client companies with strict cryptographic tenant data isolation.",
        tag: "CA Practice Scale",
        icon: "Building2",
      },
      {
        title: "Client Magic Link Upload Portal",
        description:
          "Give each client a secure branded link where their staff can drag & drop receipts and invoices without needing access to your master books.",
        tag: "Zero-Hassle Intake",
        icon: "Send",
      },
      {
        title: "Complete Audit Trail Log",
        description:
          "Every voucher edit, approval, and export records the author, exact timestamp, and prior values for pristine audit preparedness.",
        tag: "Peer-Review Ready",
        icon: "History",
      },
    ],
  },
  audiences: {
    title: "Tailored for the Needs of Both Advisors & Business Owners",
    subtitle: "Whether you run a high-volume CA practice or manage your own growing business books.",
    tabs: [
      {
        id: "ca",
        label: "For CA Firms & Practitioners",
        headline: "Scale Your Practice Without Scaling Headcount",
        bullets: [
          {
            title: "Multi-Client Firm Dashboard",
            desc: "Switch between 50+ clients with one click, track team review status, and monitor firm-wide processing queues.",
          },
          {
            title: "Client Portal & Request Links",
            desc: "Stop chasing clients on WhatsApp. Auto-send periodic upload requests with deadline tracking.",
          },
          {
            title: "Bulk Tally & Busy Export",
            desc: "Generate master XML batches for monthly or quarterly book closing in a single download.",
          },
          {
            title: "Reviewer & Staff Role Control",
            desc: "Assign article clerks to extraction review while senior partners retain final approval and export authority.",
          },
        ],
      },
      {
        id: "smb",
        label: "For SMB Founders & Finance Teams",
        headline: "Never Fall Behind on Your Monthly Books Again",
        bullets: [
          {
            title: "Real-Time Expense Visibility",
            desc: "Know exactly who you owe and when, with automated expense categorizations straight from uploaded receipts.",
          },
          {
            title: "MSME Section 43B(h) Protection",
            desc: "Receive proactive alerts before vendor payment deadlines lapse to protect your company from tax deductions.",
          },
          {
            title: "Instant CA Handover",
            desc: "Your chartered accountant gets clean, pre-categorized double-entry data, cutting your tax filing fees and delays.",
          },
          {
            title: "Bank & GST ITC Reconciliation",
            desc: "Prevent cash leaks and claim every single rupee of valid Input Tax Credit with automated 3-way checks.",
          },
        ],
      },
    ],
  },
  roiCalculator: {
    title: "Calculate Your Practice's Time & Cost Savings",
    subtitle: "See how much time your team reclaims every single month by eliminating manual data entry.",
    defaults: {
      invoicesPerMonth: 400,
      clientEntities: 8,
      minutesPerInvoiceManual: 8,
      minutesPerInvoiceFinBot: 0.75,
      hourlyCostInr: 250,
    },
  },
  security: {
    title: "Enterprise-Grade Security & Indian Data Isolation",
    subtitle: "Your financial data is protected by strict logical tenancy and bank-grade encryption protocols.",
    pillars: [
      {
        title: "Multi-Tenant Isolation",
        description: "Strict database query boundaries enforce logical separation across firms, clients, and staff roles.",
        icon: "Lock",
      },
      {
        title: "End-to-End Encryption",
        description: "TLS 1.3 in transit and AES-256 for documents at rest. Raw credentials never stored in plain text.",
        icon: "KeyRound",
      },
      {
        title: "Indian Data Residency",
        description: "Cloud infrastructure hosted in India (Mumbai/Hyderabad) compliant with RBI and MCA storage norms.",
        icon: "MapPin",
      },
      {
        title: "Role-Based Access Control",
        description: "Granular permissions for Firm Admins, Senior CAs, Article Clerks, and Client Viewers.",
        icon: "UserCheck",
      },
    ],
  },
  pricing: {
    title: "Simple, Predictable Pricing for Any Practice Size",
    subtitle: "Start with our 14-day free trial. No credit card required. Upgrade when you grow.",
    annualDiscount: "Get 2 Months Free on Annual Plans",
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know about getting started with CKsFinBot.",
    items: [
      {
        question: "Does CKsFinBot replace Tally or Busy?",
        answer:
          "No, CKsFinBot works alongside your existing accounting software. It eliminates the manual, error-prone data entry stage. Once documents are parsed and approved in CKsFinBot, it generates native XML files that import directly into Tally Prime, Tally ERP 9, or Busy with zero manual typing.",
      },
      {
        question: "How accurate is the AI invoice extraction?",
        answer:
          "CKsFinBot delivers 98%+ accuracy on standard computer-generated invoices and receipts. For complex or skewed documents, every field has a visual confidence score, and our side-by-side Review Queue lets you verify and make corrections in seconds with keyboard shortcuts.",
      },
      {
        question: "How does Section 43B(h) MSME tracking work?",
        answer:
          "When an invoice is uploaded, CKsFinBot flags the vendor's enterprise type (Micro, Small, or Medium) based on their UDYAM number or master tag. It automatically calculates the payment due date (15 or 45 days) and highlights impending deadlines to ensure your clients avoid income tax disallowance.",
      },
      {
        question: "Can our clients upload documents themselves?",
        answer:
          "Yes! Each client workspace can generate a secure, branded Magic Link portal. Your clients can drag-and-drop their monthly invoices and bank statements from any browser or smartphone without having access to your internal firm reviews or other clients' data.",
      },
      {
        question: "What file formats can I upload?",
        answer:
          "We support single and multi-page PDFs, high-resolution scans, smartphone camera photos (JPEG, PNG, WebP), and standard bank statement exports (PDF and CSV formats from all major Indian banks).",
      },
      {
        question: "Is our financial and client data secure?",
        answer:
          "Absolutely. We apply bank-grade AES-256 encryption at rest, TLS 1.3 in transit, and strict multi-tenant boundary checks. Data is retained on Indian cloud infrastructure adhering to strict statutory confidentiality standards.",
      },
    ],
  },
  finalCta: {
    headline: "Ready to Eliminate Manual Accounting Entry?",
    subhead:
      "Join forward-thinking CA practices and businesses saving over 20+ hours every week with automated document processing.",
    primaryCta: {
      text: "Start Free 14-Day Trial",
      href: "/signup",
    },
    secondaryCta: {
      text: "Schedule CA Walkthrough",
      action: "openDemoModal",
    },
    footerNote: "Instant onboarding • No credit card required • Cancel anytime",
  },
};

export default LANDING_CONTENT;

