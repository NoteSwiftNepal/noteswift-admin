"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Send, Shield, AlertTriangle } from "lucide-react";
import { useAdmin } from "@/context/admin-context";

export default function AppUpdatePage() {
  const { admin } = useAdmin();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [currentAppUpdate, setCurrentAppUpdate] = useState<{
    isActive: boolean;
    title: string;
    subtitle: string;
    createdAt: string | null;
    createdBy: string;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Check if current admin is system admin
  const isSystemAdmin = admin?.role === 'system_admin';

  const fetchAppUpdateStatus = async () => {
    if (!isSystemAdmin) return;

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.APP_UPDATE.STATUS, createFetchOptions('GET'));

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentAppUpdate(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch app block status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchAppUpdateStatus();
  }, [isSystemAdmin]);

  const handleSendCode = async () => {
    if (!title.trim() || !subtitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and subtitle.",
        variant: "destructive",
      });
      return;
    }

    if (!isSystemAdmin) {
      toast({
        title: "Access Denied",
        description: "Only System Admin can trigger app blocks.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.APP_UPDATE.CREATE, createFetchOptions('POST', {
        title: title.trim(),
        subtitle: subtitle.trim(),
      }));

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.requiresVerification) {
          setCodeSent(true);
          setShowVerificationDialog(true);
          toast({
            title: "Verification Code Sent",
            description: "Please check info@codelitsstudio.com for the verification code.",
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send verification code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Send code error:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Verification Required",
        description: "Please enter the verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.APP_UPDATE.CREATE, createFetchOptions('POST', {
        title: title.trim(),
        subtitle: subtitle.trim(),
        verificationCode: verificationCode.trim(),
      }));

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "App Update Triggered",
          description: "All users will see the update prompt on next app launch.",
        });
        setTitle("");
        setSubtitle("");
        setVerificationCode("");
        setCodeSent(false);
        setShowVerificationDialog(false);
        // Refresh status
        await fetchAppUpdateStatus();
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid verification code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('App update error:', error);
      toast({
        title: "Error",
        description: "Failed to trigger app block. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeactivate = async () => {
    if (!isSystemAdmin) {
      toast({
        title: "Access Denied",
        description: "Only System Admin can deactivate app updates.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.APP_UPDATE.DEACTIVATE, createFetchOptions('POST'));

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "App Update Deactivated",
          description: "Users can now access the app normally.",
        });
        setShowDeactivateDialog(false);
        // Refresh status
        await fetchAppUpdateStatus();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to deactivate app update.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Deactivate error:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate app update. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          <CardTitle className="text-3xl font-bold text-gray-900">App Block Management</CardTitle>
        </div>
        <p className="text-gray-600 mt-2">Force all users to Block the app from Play Store</p>
      </div>

      {/* Current Status Display */}
      {isSystemAdmin && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-500" />
              Current App Block Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-gray-600">Loading status...</span>
              </div>
            ) : currentAppUpdate?.isActive ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-red-700">BLOCKING ACTIVE</span>
                  <span className="text-sm text-gray-600">Users cannot access the app</span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-1">{currentAppUpdate.title}</h4>
                  <p className="text-red-800 text-sm mb-2">{currentAppUpdate.subtitle}</p>
                  <div className="text-xs text-red-600">
                    Activated by: {currentAppUpdate.createdBy} • 
                    {currentAppUpdate.createdAt && new Date(currentAppUpdate.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold text-green-700">NO BLOCKING</span>
                <span className="text-sm text-gray-600">Users can access the app normally</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            System Admin Only
          </CardTitle>
          <CardDescription>
            This feature requires system admin privileges and email verification for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSystemAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Access Restricted</span>
              </div>
              <p className="text-yellow-700 mt-1">
                Only System Admin can trigger app Block. Your current role: {admin?.role || 'Unknown'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Blocking Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Critical Security Update Required"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isSystemAdmin}
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Blocking Message *</Label>
              <Textarea
                id="subtitle"
                placeholder="e.g., Please update to the latest version to continue using NoteSwift. This update includes important security fixes."
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={3}
                disabled={!isSystemAdmin}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSendCode}
              disabled={!isSystemAdmin || isSubmitting || !title.trim() || !subtitle.trim()}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send Code"}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowDeactivateDialog(true)}
              disabled={!isSystemAdmin}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Deactivate Blocking
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={(open) => {
        setShowVerificationDialog(open);
        if (!open) {
          setCodeSent(false);
          setVerificationCode("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Email Verification Required
            </DialogTitle>
            <DialogDescription>
              {codeSent 
                ? "A verification code has been sent to info@codelitsstudio.com. Please enter the code below to confirm the app update."
                : "Click 'Send Code' to receive a verification code via email."
              }
            </DialogDescription>
          </DialogHeader>

          {codeSent && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleVerificationSubmit}
                  disabled={isVerifying || !verificationCode.trim()}
                  className="flex-1"
                >
                  {isVerifying ? "Verifying..." : "Confirm Update"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVerificationDialog(false);
                    setCodeSent(false);
                    setVerificationCode("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!codeSent && (
            <div className="flex gap-3">
              <Button
                onClick={handleSendCode}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Sending..." : "Send Code"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowVerificationDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Deactivate App Blocking
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the update requirement and allow users to access the app normally.
              Are you sure you want to deactivate the app block?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 hover:bg-red-700">
              Deactivate Blocking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}