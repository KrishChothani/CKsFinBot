/** @format */

import React, { useState } from "react";
import { Modal, ModalContent } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Calendar, CheckCircle2, Sparkles, Clock, Send } from "lucide-react";

export const DemoBookingModal = ({ open, onOpenChange }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    firmName: "",
    monthlyVolume: "100-500",
    preferredTime: "Morning (10:00 AM - 1:00 PM)",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleClose = (newOpen) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setTimeout(() => setSubmitted(false), 300);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent
        maxWidth="max-w-md"
        title={submitted ? "Walkthrough Scheduled!" : "Book a 1-on-1 Practice Walkthrough"}
        description={
          submitted
            ? "We've received your request. A CA onboarding specialist will reach out shortly."
            : "See how CKsFinBot can automate your clients' document intake and Tally XML exports."
        }
      >
        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-[var(--text-primary)]">
                Demo Request Confirmed!
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                We'll email a Google Meet invite and sample GST data pack to{" "}
                <strong className="text-[var(--text-primary)] font-mono">{formData.email || "your email"}</strong>.
              </p>
            </div>
            <div className="pt-3">
              <Button onClick={() => handleClose(false)} className="w-full justify-center">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <Input
              label="Full Name"
              required
              placeholder="CA Rajesh Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Input
              label="Work / Practice Email"
              type="email"
              required
              placeholder="rajesh@sharmaca.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Firm / Company Name"
              required
              placeholder="R. Sharma & Associates CA"
              value={formData.firmName}
              onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Estimated Monthly Document Volume
              </label>
              <select
                value={formData.monthlyVolume}
                onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="Under 100">Under 100 docs / month</option>
                <option value="100-500">100 to 500 docs / month (Solo CA)</option>
                <option value="500-2000">500 to 2,000 docs / month (Firm)</option>
                <option value="2000+">2,000+ docs / month (Multi-partner Enterprise)</option>
              </select>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full justify-center gap-2 py-2.5">
                <Send className="w-4 h-4" />
                <span>Confirm Demo Walkthrough</span>
              </Button>
              <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
                15-minute screen share with live Indian GST & Tally XML export demo.
              </p>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DemoBookingModal;

