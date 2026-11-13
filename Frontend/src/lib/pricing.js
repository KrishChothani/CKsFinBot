/** @format */

export const PRICING_TIERS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For solo practitioners and small businesses getting started with AI bookkeeping.",
    monthlyPrice: 1999,
    annualPrice: 19990, // ~₹1,665/mo (2 months free)
    popular: false,
    badge: "Solo Practitioner",
    features: [
      "Up to 150 documents / month",
      "1 Client / Entity workspace",
      "Automated Line-Item & GST Extraction",
      "Direct Tally Prime & Busy XML Export",
      "Double-Entry Balanced Voucher Generator",
      "Standard Email Support",
    ],
    ctaText: "Start Free Trial",
    ctaHref: "/signup?plan=starter",
  },
  {
    id: "growth",
    name: "Growth (CA Practice)",
    tagline: "The most popular plan for CA firms managing multiple client audit pipelines.",
    monthlyPrice: 5999,
    annualPrice: 59990, // ~₹4,999/mo (2 months free)
    popular: true,
    badge: "Most Popular",
    features: [
      "Up to 1,000 documents / month",
      "Up to 10 Client / Entity workspaces",
      "Section 43B(h) MSME 45-Day Overdue Tracker",
      "GSTR-2B 3-Way Auto-Reconciliation",
      "Bank Statement (BRS) Auto-Matching",
      "Client Magic Link Upload Portals",
      "Audit Trail & Ledger Modification Logs",
      "Priority WhatsApp & Phone Support",
    ],
    ctaText: "Start 14-Day Free Trial",
    ctaHref: "/signup?plan=growth",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For high-volume CA partnerships, corporate finance teams, and multi-branch firms.",
    monthlyPrice: 14999,
    annualPrice: 149990,
    popular: false,
    badge: "Multi-Partner Firm",
    features: [
      "Up to 3,500 documents / month",
      "Unlimited Client / Entity workspaces",
      "Custom Chart of Accounts Rules Engine",
      "Role-Based Access (Admins, Reviewers, Clients)",
      "Multi-GSTIN Group Consolidated View",
      "Priority OCR Extraction Pipeline (Fast-Track)",
      "Dedicated CA Implementation Specialist",
      "Custom ERP Integrations & API Access",
    ],
    ctaText: "Contact Enterprise Sales",
    ctaHref: "/signup?plan=enterprise",
  },
];

export default PRICING_TIERS;

