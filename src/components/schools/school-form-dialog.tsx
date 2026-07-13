"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Upload, X, School as SchoolIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SHORT_CODE_PATTERN = /^[A-Z0-9]{2,10}$/;
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB, matches backend limit

interface SchoolFormValue {
  _id: string;
  name: string;
  shortCode: string;
  address?: string;
  logoUrl?: string;
}

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: SchoolFormValue;
  onSaved: () => void;
}

// A logo can be: 'unchanged' (leave as-is, edit mode default), a base64 data
// URL (new upload), or null (explicit removal).
type PendingLogo = "unchanged" | string | null;

export function SchoolFormDialog({ open, onOpenChange, school, onSaved }: SchoolFormDialogProps) {
  const isEdit = !!school;
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [address, setAddress] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<PendingLogo>("unchanged");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shortCodeError, setShortCodeError] = useState("");
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(school?.name || "");
    setShortCode(school?.shortCode || "");
    setAddress(school?.address || "");
    setLogoPreview(school?.logoUrl || null);
    setPendingLogo("unchanged");
    setError("");
    setShortCodeError("");
    setLogoError("");
  }, [open, school]);

  const resetAndClose = () => {
    if (loading) return;
    onOpenChange(false);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLogoError("");

    if (!file.type.startsWith("image/")) {
      setLogoError("Please select an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(`Image too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 5MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setPendingLogo(dataUrl);
    };
    reader.onerror = () => setLogoError("Failed to read the selected image.");
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setPendingLogo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShortCodeError("");

    if (!name.trim()) {
      setError("School name is required.");
      return;
    }

    const normalizedShortCode = shortCode.trim().toUpperCase();
    if (!SHORT_CODE_PATTERN.test(normalizedShortCode)) {
      setShortCodeError("2-10 letters/numbers, no spaces.");
      return;
    }

    setLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const payload = {
        name: name.trim(),
        shortCode: normalizedShortCode,
        address: address.trim() || undefined,
        logo: pendingLogo === "unchanged" ? undefined : pendingLogo,
      };
      const response = await fetch(
        isEdit ? API_ENDPOINTS.SCHOOLS.UPDATE(school!._id) : API_ENDPOINTS.SCHOOLS.CREATE,
        createFetchOptions(isEdit ? 'PUT' : 'POST', payload)
      );
      const data = await response.json();

      if (response.ok && data.success) {
        onSaved();
        resetAndClose();
      } else if (response.status === 409) {
        setShortCodeError(data.message || "A school with this short code already exists.");
      } else {
        setError(data.message || `Failed to ${isEdit ? "update" : "create"} school.`);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit School" : "Add School"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this school's details, including its logo."
                : "Create a new school. Its short code is used as the prefix on bulk unlock codes issued for it."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>School Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="School logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <SchoolIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {logoPreview ? "Change" : "Upload"}
                    </Button>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Optional. PNG or JPG, up to 5MB.</p>
                  {logoError && <p className="text-xs text-destructive">{logoError}</p>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
              <Input
                id="school-name"
                placeholder="Springfield High School"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-short-code">Short Code *</Label>
              <Input
                id="school-short-code"
                placeholder="ABC"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength={10}
                className="uppercase"
                required
              />
              <p className="text-xs text-muted-foreground">
                2-10 letters/numbers, no spaces. Used as the prefix on this school's bulk unlock codes (e.g. {shortCode || "ABC"}-X7K9P2).
              </p>
              {shortCodeError && (
                <p className="text-xs text-destructive">{shortCodeError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-address">Address</Label>
              <Textarea
                id="school-address"
                placeholder="School address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Saving..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Add School"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
