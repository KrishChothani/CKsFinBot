/** @format */

import React, { useState } from "react";
import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";
import IntegrationBar from "../components/landing/IntegrationBar";
import HowItWorks from "../components/landing/HowItWorks";
import ShowcaseGallery from "../components/landing/ShowcaseGallery";
import BentoFeatures from "../components/landing/BentoFeatures";
import AudienceSwitcher from "../components/landing/AudienceSwitcher";
import RoiCalculator from "../components/landing/RoiCalculator";
import SecurityCompliance from "../components/landing/SecurityCompliance";
import PricingSection from "../components/landing/PricingSection";
import FaqSection from "../components/landing/FaqSection";
import FinalCta from "../components/landing/FinalCta";
import LandingFooter from "../components/landing/LandingFooter";
import DemoBookingModal from "../components/landing/DemoBookingModal";

export const Landing = () => {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--primary-light)] selection:text-[var(--primary)] flex flex-col">
      {/* 1. Header / Sticky Navbar */}
      <LandingNavbar onOpenDemoModal={() => setDemoModalOpen(true)} />

      <main className="flex-1">
        {/* 2. Hero Section with Live Mockup */}
        <HeroSection onOpenDemoModal={() => setDemoModalOpen(true)} />

        {/* 3. Verified Standards & Integrations Bar */}
        <IntegrationBar />

        {/* 4. How It Works: 3-Step Animated Flow */}
        <HowItWorks />

        {/* 5. Interactive Showcase Gallery */}
        <ShowcaseGallery />

        {/* 6. Bento Grid Feature Matrix */}
        <BentoFeatures />

        {/* 7. Two-Audience Switcher (CA Firms vs SMBs) */}
        <AudienceSwitcher />

        {/* 8. Interactive ROI & Time Savings Estimator */}
        <RoiCalculator />

        {/* 9. Security, Privacy & Data Isolation */}
        <SecurityCompliance />

        {/* 10. Transparent Pricing */}
        <PricingSection />

        {/* 11. Frequently Asked Questions */}
        <FaqSection />

        {/* 12. Final High-Impact CTA Banner */}
        <FinalCta onOpenDemoModal={() => setDemoModalOpen(true)} />
      </main>

      {/* 13. Comprehensive Footer */}
      <LandingFooter />

      {/* 14. 1-on-1 Walkthrough Demo Modal */}
      <DemoBookingModal
        open={demoModalOpen}
        onOpenChange={setDemoModalOpen}
      />
    </div>
  );
};

export default Landing;

