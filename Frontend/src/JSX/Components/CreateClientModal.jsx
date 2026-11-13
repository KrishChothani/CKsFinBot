/** @format */

import React, { useState } from "react";
import { X, Building2, Check, AlertCircle } from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";

const CreateClientModal = ({ isOpen, onClose }) => {
  const { createClient } = useTenant();
  const [formData, setFormData] = useState({
    businessName: "",
    tradeName: "",
    legalStructure: "Private_Limited",
    gstin: "",
    panNumber: "",
    industry: "General",
    financialYear: "2024-2025",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Auto-extract PAN & State code from GSTIN
  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase();
    const updated = { gstin: val };
    if (val.length >= 12) {
      updated.panNumber = val.substring(2, 12);
    }
    setFormData((prev) => ({ ...prev, ...updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.businessName.trim()) {
      setError("Business legal name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createClient({
        ...formData,
        financialYear: { currentFY: formData.financialYear },
      });
      onClose();
    } catch (err) {
      console.error("Failed to create client:", err);
      setError(err.response?.data?.message || "Failed to create client workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="flex flex-col w-full max-w-lg bg-[#0d1424] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0a0f1d]">
          <div className="flex items-center gap-2.5 text-blue-400">
            <Building2 className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Create Client Workspace</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Business Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ABC Enterprises Private Limited"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Trade / Brand Name
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Tech"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Legal Structure
              </label>
              <select
                value={formData.legalStructure}
                onChange={(e) => setFormData({ ...formData, legalStructure: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Private_Limited">Private Limited (Pvt Ltd)</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="Sole_Proprietorship">Sole Proprietorship</option>
                <option value="Partnership">Partnership Firm</option>
                <option value="Public_Limited">Public Limited</option>
                <option value="Individual">Individual / Freelancer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 24AAACA1234A1Z5"
                value={formData.gstin}
                onChange={handleGstinChange}
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. AAACA1234A"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Current Financial Year
              </label>
              <select
                value={formData.financialYear}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="2024-2025">FY 2024 - 2025 (Apr-Mar)</option>
                <option value="2025-2026">FY 2025 - 2026 (Apr-Mar)</option>
                <option value="2023-2024">FY 2023 - 2024 (Apr-Mar)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Industry
              </label>
              <input
                type="text"
                placeholder="e.g. Manufacturing, Retail, IT Services"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Creating..." : "Create Client & Seed Ledgers"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClientModal;

