
"use client";

import { useState, useEffect } from "react";
import { useLoading } from "@/context/loading-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Loader2, Bell, Smartphone, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  _id: string;
  id: string;
  type: 'homepage' | 'push';
  title: string;
  description?: string;
  subject?: string;
  message?: string;
  status: 'draft' | 'sent' | 'scheduled';
  sentAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [isSending, setIsSending] = useState(false);
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const [homepageNotification, setHomepageNotification] = useState({
    badge: '',
    badgeIcon: 'notifications',
    title: '',
    description: '',
    thumbnail: '',
    showDontShowAgain: true,
    buttonText: 'Close',
    buttonIcon: 'close'
  });

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.LIST, createFetchOptions('GET'));
      const data = await response.json();
      if (data.success) {
        setNotifications(data.result.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setDetailsDialogOpen(true);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Notification Deleted",
          description: "The notification has been successfully deleted.",
        });
        fetchNotifications(); // Refresh the list
      } else {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    }
  };

  const handleSendHomepageNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    startLoading();

    try {
      const notificationData = {
        type: 'homepage',
        ...homepageNotification,
        status: 'sent',
        sentAt: new Date().toISOString(),
        adminId: 'admin-system' // In real app, get from auth
      };

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.NOTIFICATIONS.CREATE,
        createFetchOptions('POST', notificationData)
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Homepage Notification Sent!",
          description: "The notification will appear on students' homepages.",
        });
        fetchNotifications(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending homepage notification:', error);
      toast({
        title: "Error",
        description: "Failed to send homepage notification",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
      stopLoading();
    }
  };

  const handleSendPushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingPush(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const notificationData = {
        type: 'push',
        title: formData.get('pushTitle'),
        subject: formData.get('pushSubject'),
        message: formData.get('pushMessage'),
        status: 'sent',
        sentAt: new Date().toISOString(),
        adminId: 'admin-system' // In real app, get from auth
      };

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.NOTIFICATIONS.CREATE,
        createFetchOptions('POST', notificationData)
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Push Notification Sent!",
          description: `The notification has been sent to all students with registered devices.`,
        });
        fetchNotifications(); // Refresh the list
      } else {
        throw new Error(data.error || data.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      toast({
        title: "Error",
        description: "Failed to send push notification",
        variant: "destructive"
      });
    } finally {
      setIsSendingPush(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
 <div>
           <div className="flex items-center gap-2">
                      <Bell className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">Notifications</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Manage and send notifications to students and teachers</p>
        </div>      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Homepage Notification</CardTitle>
            <CardDescription>Send a notification that appears on students' homepages.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendHomepageNotification} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge">Badge Text</Label>
                  <Input
                    id="badge"
                    placeholder="e.g., Important"
                    value={homepageNotification.badge}
                    onChange={(e) => setHomepageNotification(prev => ({ ...prev, badge: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badgeIcon">Badge Icon</Label>
                  <Select value={homepageNotification.badgeIcon} onValueChange={(value) => setHomepageNotification(prev => ({ ...prev, badgeIcon: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notifications">Notifications</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationTitle">Title</Label>
                <Input
                  id="notificationTitle"
                  placeholder="Notification title"
                  value={homepageNotification.title}
                  onChange={(e) => setHomepageNotification(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationDescription">Description</Label>
                <Textarea
                  id="notificationDescription"
                  placeholder="Notification description..."
                  value={homepageNotification.description}
                  onChange={(e) => setHomepageNotification(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[80px]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL (optional)</Label>
                <Input
                  id="thumbnail"
                  placeholder="https://example.com/image.jpg"
                  value={homepageNotification.thumbnail}
                  onChange={(e) => setHomepageNotification(prev => ({ ...prev, thumbnail: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDontShowAgain"
                  checked={homepageNotification.showDontShowAgain}
                  onCheckedChange={(checked) => setHomepageNotification(prev => ({ ...prev, showDontShowAgain: checked as boolean }))}
                />
                <Label htmlFor="showDontShowAgain">Show "Don't show again" option</Label>
              </div>
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending && <Loader2 className="animate-spin" />}
                <Bell className="w-4 h-4 mr-2" />
                Send Homepage Notification
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>Send direct notifications to students' mobile devices. Notifications will appear in their native notification tray.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendPushNotification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pushTitle">Title</Label>
                <Input id="pushTitle" name="pushTitle" placeholder="Notification title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pushSubject">Subject (optional)</Label>
                <Input id="pushSubject" name="pushSubject" placeholder="Brief subject line" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pushMessage">Message</Label>
                <Textarea id="pushMessage" name="pushMessage" placeholder="Notification message..." className="min-h-[80px]" required />
              </div>
              <Button type="submit" className="w-full" disabled={isSendingPush}>
                {isSendingPush && <Loader2 className="animate-spin" />}
                <Smartphone className="w-4 h-4 mr-2" />
                Send Push Notification
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>View all sent notifications and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="text-sm text-muted-foreground">
              {notifications.length} notifications
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                        Loading notifications...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No notifications sent yet
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{item.title}</div>
                          {item.subject && (
                            <div className="text-sm text-muted-foreground">{item.subject}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "sent" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteNotification(item._id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              Complete information about this notification.
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="capitalize">
                      {selectedNotification.type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedNotification.status === "sent" ? "default" : "secondary"}>
                      {selectedNotification.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Title</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  {selectedNotification.title}
                </div>
              </div>

              {selectedNotification.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {selectedNotification.description}
                  </div>
                </div>
              )}

              {selectedNotification.subject && (
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    {selectedNotification.subject}
                  </div>
                </div>
              )}

              {selectedNotification.message && (
                <div>
                  <Label className="text-sm font-medium">Message</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {selectedNotification.message}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created At</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </div>
                </div>
                {selectedNotification.sentAt && (
                  <div>
                    <Label className="text-sm font-medium">Sent At</Label>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {new Date(selectedNotification.sentAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Notification ID</Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-xs">
                  {selectedNotification.id}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
