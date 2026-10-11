"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, createFetchOptions } from "@/config/api";

// VAT used to split each checkout total into taxable amount + VAT.
// Course prices are entered VAT-inclusive (Nepal's IRD requires prices to
// be published inclusive of all taxes), so changing this never changes what
// students pay — only the breakdown on checkout and receipts.
export function VatSettings() {
  const { toast } = useToast();
  const [vatRate, setVatRate] = useState("");
  const [saved, setSaved] = useState<{ vatRate: number; updatedAt: string | null; updatedByName: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PRICING.SETTINGS, createFetchOptions("GET"));
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load");
        setSaved(json.data);
        setVatRate(String(json.data.vatRate));
      } catch (err: any) {
        toast({ title: "Couldn't load VAT setting", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const rate = Number(vatRate);
  const valid = vatRate.trim() !== "" && Number.isFinite(rate) && rate >= 0 && rate <= 100;
  // Same split as the backend: VAT-inclusive Rs 1000 example.
  const exampleTaxable = valid ? Math.round((100000 * 100) / (100 + rate)) / 100 : 0;
  const exampleVat = valid ? Math.round((1000 - exampleTaxable) * 100) / 100 : 0;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.PRICING.SETTINGS, createFetchOptions("PUT", { vatRate: rate }));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save");
      setSaved(json.data);
      toast({ title: "VAT setting saved", description: `VAT is now ${json.data.vatRate}%.` });
    } catch (err: any) {
      toast({ title: "Couldn't save VAT setting", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <Label htmlFor="vatRate" className="text-base font-semibold">VAT</Label>
        <p className="text-sm text-gray-600">
          Course prices include VAT. This rate only decides how each total is split into taxable amount and VAT on checkout and
          receipts — what students pay doesn&apos;t change. Use 0 if your courses are VAT-exempt (confirm with your accountant).
        </p>
      </div>
      <div className="flex items-end gap-3">
        <div className="w-40">
          <Label htmlFor="vatRate">VAT rate (%)</Label>
          <Input
            id="vatRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={vatRate}
            disabled={loading}
            onChange={(e) => setVatRate(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading || saving || !valid || rate === saved?.vatRate}>
          {saving ? "Saving..." : "Save VAT"}
        </Button>
      </div>
      {valid ? (
        <p className="text-xs text-gray-500">
          Example: a Rs 1000 course = Rs {exampleTaxable.toFixed(2)} taxable + Rs {exampleVat.toFixed(2)} VAT.
        </p>
      ) : (
        <p className="text-xs text-red-600">Enter a rate from 0 to 100.</p>
      )}
      {saved?.updatedAt && (
        <p className="text-xs text-gray-400">
          Last changed {new Date(saved.updatedAt).toLocaleString()}
          {saved.updatedByName ? ` by ${saved.updatedByName}` : ""}
        </p>
      )}
    </div>
  );
}
