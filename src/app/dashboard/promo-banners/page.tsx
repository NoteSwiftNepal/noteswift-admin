"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Image, Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";

interface PromoBanner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  badge?: string;
  link?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function PromoBannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [image, setImage] = useState("");
  const [badge, setBadge] = useState("");
  const [link, setLink] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState(0);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<PromoBanner | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchBanners = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import("@/config/api");
      const response = await fetch(API_ENDPOINTS.PROMO_BANNERS.LIST, createFetchOptions("GET"));
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBanners(data.result.banners || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch banners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setImage("");
    setBadge("");
    setLink("");
    setIsActive(true);
    setOrder(0);
    setEditingBanner(null);
  };

  const openCreate = () => {
    resetForm();
    setOrder(banners.length);
    setShowDialog(true);
  };

  const openEdit = (banner: PromoBanner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || "");
    setImage(banner.image);
    setBadge(banner.badge || "");
    setLink(banner.link || "");
    setIsActive(banner.isActive);
    setOrder(banner.order);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !image.trim()) {
      toast({ title: "Error", description: "Title and Image URL are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import("@/config/api");
      const url = editingBanner
        ? API_ENDPOINTS.PROMO_BANNERS.UPDATE(editingBanner._id)
        : API_ENDPOINTS.PROMO_BANNERS.CREATE;
      const method = editingBanner ? "PUT" : "POST";

      const response = await fetch(url, createFetchOptions(method, {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        image: image.trim(),
        badge: badge.trim() || undefined,
        link: link.trim() || undefined,
        isActive,
        order,
      }));

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: editingBanner ? "Banner updated successfully." : "Banner created successfully.",
        });
        setShowDialog(false);
        resetForm();
        fetchBanners();
      } else {
        toast({ title: "Error", description: data.error || "Operation failed.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save banner.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import("@/config/api");
      const response = await fetch(
        API_ENDPOINTS.PROMO_BANNERS.DELETE(deleteTarget._id),
        createFetchOptions("DELETE")
      );
      const data = await response.json();
      if (data.success) {
        toast({ title: "Deleted", description: "Banner removed successfully." });
        setShowDeleteDialog(false);
        setDeleteTarget(null);
        fetchBanners();
      } else {
        toast({ title: "Error", description: data.error || "Delete failed.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete banner.", variant: "destructive" });
    }
  };

  const activeCount = banners.filter((b) => b.isActive).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promo Banners</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the image carousel displayed on the student app homepage.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Banner
        </Button>
      </div>

      {/* Image Size Guide */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Image className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Recommended Image Size</p>
              <p className="text-sm text-blue-700 mt-1">
                Upload images at <strong>800 × 400 pixels</strong> (2:1 aspect ratio).
                The banner displays at 180px height on mobile with cover-fit.
                Use high-quality JPG or PNG images. Max file size: 2MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Banners</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{banners.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-400">{banners.length - activeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Banners Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Banners</CardTitle>
          <CardDescription>
            Drag to reorder (coming soon). Active banners appear in the student app carousel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No banners yet. Click "Add Banner" to create one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner._id}>
                    <TableCell>
                      <div className="h-10 w-16 rounded bg-gray-100 overflow-hidden">
                        <img
                          src={banner.image}
                          alt={banner.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='50'><rect fill='%23e5e7eb' width='80' height='50'/><text x='40' y='28' text-anchor='middle' fill='%239ca3af' font-size='10'>No img</text></svg>";
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <p>{banner.title}</p>
                      {banner.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{banner.subtitle}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {banner.badge ? (
                        <Badge variant="secondary">{banner.badge}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{banner.order}</TableCell>
                    <TableCell>
                      <Badge variant={banner.isActive ? "default" : "outline"}>
                        {banner.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(banner)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget(banner);
                            setShowDeleteDialog(true);
                          }}
                          title="Delete"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
            <DialogDescription>
              Banners appear in the auto-scrolling carousel on the student app homepage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Courses Available"
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Explore our latest courses in AI & ML"
              />
            </div>

            <div>
              <Label htmlFor="image">Image URL *</Label>
              <Input
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/banner.jpg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 800×400px (2:1). Use direct image URLs (JPG/PNG).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="badge">Badge Text</Label>
                <Input
                  id="badge"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. NEW"
                />
              </div>
              <div>
                <Label htmlFor="link">Link URL (optional)</Label>
                <Input
                  id="link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="e.g. /courses/123"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBanner ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
