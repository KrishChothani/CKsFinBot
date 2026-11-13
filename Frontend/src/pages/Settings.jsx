/** @format */

import React, { useState, useEffect } from "react";
import { Check, ShieldCheck, Building2, Save } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useTenant } from "../JSX/Contexts/TenantContext";
import { getPracticeBranding, updatePracticeBranding } from "../services/apiClient";

export default function SettingsPage() {
  const { firm } = useTenant();

  const [branding, setBranding] = useState({
    firmName: "",
    icaiRegistrationNumber: "",
    partnerName: "",
    membershipNumber: "",
    letterheadHeader: "",
    letterheadFooter: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    address: {
      line1: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await getPracticeBranding();
        const data = res.data?.data;
        if (data) {
          setBranding({
            firmName: data.firmName || firm?.name || "",
            icaiRegistrationNumber: data.branding?.icaiRegistrationNumber || "014582S",
            partnerName: data.branding?.partnerName || "CA Rajesh Sharma, FCA",
            membershipNumber: data.branding?.membershipNumber || "054321",
            letterheadHeader:
              data.branding?.letterheadHeader || "Chartered Accountants & Financial Advisors",
            letterheadFooter:
              data.branding?.letterheadFooter ||
              "This statement is prepared for internal management review and statutory compliance. Subject to audit under the Companies Act, 2013 and Income Tax Act, 1961.",
            contactEmail: data.branding?.contactEmail || firm?.email || "",
            contactPhone: data.branding?.contactPhone || firm?.phone || "",
            website: data.branding?.website || "",
            address: {
              line1: data.address?.line1 || "",
              city: data.address?.city || "",
              state: data.address?.state || "",
              pincode: data.address?.pincode || "",
            },
          });
        }
      } catch (err) {
        console.error("Failed to fetch firm branding:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadBranding();
  }, [firm]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updatePracticeBranding({
        icaiRegistrationNumber: branding.icaiRegistrationNumber,
        partnerName: branding.partnerName,
        membershipNumber: branding.membershipNumber,
        letterheadHeader: branding.letterheadHeader,
        letterheadFooter: branding.letterheadFooter,
        contactEmail: branding.contactEmail,
        contactPhone: branding.contactPhone,
        website: branding.website,
        officeAddress: branding.address,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save practice branding: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice Settings & White-Label Branding"
        description="Configure your CA practice identity, ICAI registration details, letterhead headers, and digital report styling."
        breadcrumbs={[{ label: "Overview", href: "/app/dashboard" }, { label: "Settings" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>CA Practice & Statutory Letterhead Profile</CardTitle>
                  <CardDescription>
                    These details appear on client summary reports, letterheads, and statutory exports.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <Input
                  label="Legal Practice Name"
                  value={branding.firmName}
                  onChange={(e) => setBranding({ ...branding, firmName: e.target.value })}
                  disabled
                  helperText="Managed in account registration"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ICAI Firm Registration Number (FRN) *"
                    value={branding.icaiRegistrationNumber}
                    onChange={(e) =>
                      setBranding({ ...branding, icaiRegistrationNumber: e.target.value })
                    }
                    placeholder="e.g. 014582S"
                    required
                  />
                  <Input
                    label="Managing Partner Name *"
                    value={branding.partnerName}
                    onChange={(e) =>
                      setBranding({ ...branding, partnerName: e.target.value })
                    }
                    placeholder="e.g. CA Rajesh Sharma, FCA"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ICAI Membership Number (M.No.) *"
                    value={branding.membershipNumber}
                    onChange={(e) =>
                      setBranding({ ...branding, membershipNumber: e.target.value })
                    }
                    placeholder="e.g. 054321"
                    required
                  />
                  <Input
                    label="Practice Tagline / Header"
                    value={branding.letterheadHeader}
                    onChange={(e) =>
                      setBranding({ ...branding, letterheadHeader: e.target.value })
                    }
                    placeholder="e.g. Chartered Accountants & Tax Consultants"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[var(--text-primary)]">
                    Letterhead Statutory Disclaimer & Footer
                  </label>
                  <textarea
                    rows={2}
                    value={branding.letterheadFooter}
                    onChange={(e) =>
                      setBranding({ ...branding, letterheadFooter: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Office Address (Line 1)"
                    value={branding.address.line1}
                    onChange={(e) =>
                      setBranding({
                        ...branding,
                        address: { ...branding.address, line1: e.target.value },
                      })
                    }
                    placeholder="Suite 401, Nariman Point"
                  />
                  <Input
                    label="City & State"
                    value={branding.address.city}
                    onChange={(e) =>
                      setBranding({
                        ...branding,
                        address: { ...branding.address, city: e.target.value },
                      })
                    }
                    placeholder="Mumbai, Maharashtra"
                  />
                  <Input
                    label="PIN Code"
                    value={branding.address.pincode}
                    onChange={(e) =>
                      setBranding({
                        ...branding,
                        address: { ...branding.address, pincode: e.target.value },
                      })
                    }
                    placeholder="400021"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {saveSuccess && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Practice branding updated!
                    </span>
                  )}
                  <div className="ml-auto">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      icon={Save}
                      isLoading={isSaving}
                    >
                      Save Branding
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Data Security & Statutory Integrity</CardTitle>
                <CardDescription>
                  Indian DPDP Act and fintech data protection parameters.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-[var(--text-muted)]">
              <p>• Documents are stored with AWS S3 AES-256 server-side encryption.</p>
              <p>• Statutory audit trails and double-entry voucher ledgers are strictly immutable.</p>
              <p>• Multi-tenant isolation is enforced at MongoDB query and middleware boundaries.</p>
              <p>• Client financial summaries are sealed with canonical SHA-256 digital hashes.</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--primary-light)] border border-[var(--primary-border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                  Current Plan
                </span>
                <h4 className="text-lg font-bold text-[var(--primary)] mt-0.5">
                  {firm?.subscription?.plan || "CA Firm Enterprise"}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Full white-label branding, automated bank BRS, and GSTR-2B statutory reconciliation.
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
