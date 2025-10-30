import { useState, useEffect, useCallback } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "./use-toast";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useApiQuery(
    ["/api/notifications"],
    '/api/notifications',
    undefined,
    {
      enabled: !!userId,
      refetchInterval: 30000, // Refetch every 30 seconds as fallback
    }
  );

  // Fetch unread count
  const { data: unreadCountData } = useApiQuery(
    ["/api/notifications/unread-count"],
    '/api/notifications/unread-count',
    undefined,
    {
      enabled: !!userId,
      refetchInterval: 15000, // Refetch every 15 seconds
    }
  );

  // Mark notification as read mutation
  const markAsReadMutation = useApiMutation(
    (notificationId: string) => api.put(`/api/notifications/${notificationId}/read`),
    {
      onSuccess: () => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      },
    }
  );

  // Handle real-time notification updates
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === "notification") {
      const newNotification = message.data;
      
      // Add to local state immediately
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show toast notification
      toast({
        title: newNotification.title,
        description: newNotification.message,
        duration: 5000,
      });
      
      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    }
  }, [toast, queryClient]);

  // Setup WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    onMessage: handleWebSocketMessage,
    userId,
    autoReconnect: true,
  });

  // Update local state when server data changes
  useEffect(() => {
    if (notificationsData && Array.isArray(notificationsData)) {
      setNotifications(notificationsData);
    }
  }, [notificationsData]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistically update local state
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true, readAt: new Date().toISOString() }
          : notification
      )
    );

    // Update server
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: false, readAt: undefined }
            : notification
        )
      );
      
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  }, [markAsReadMutation, toast]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    // Optimistically update all unread notifications
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true, readAt: new Date().toISOString() }))
    );

    try {
      // Mark each unread notification as read
      await Promise.all(
        unreadNotifications.map(notification =>
          markAsReadMutation.mutateAsync(notification.id)
        )
      );
    } catch (error) {
      // Revert optimistic updates on error
      setNotifications(prev =>
        prev.map(notification => {
          const wasUnread = unreadNotifications.find(n => n.id === notification.id);
          return wasUnread 
            ? { ...notification, isRead: false, readAt: undefined }
            : notification;
        })
      );
      
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  }, [notifications, markAsReadMutation, toast]);

  // Delete notification (local only for now)
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = useCallback(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notifications.filter(
      notification => new Date(notification.createdAt) > oneDayAgo
    );
  }, [notifications]);

  const unreadCount = (unreadCountData as { count?: number })?.count ?? notifications.filter(n => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  return {
    notifications,
    unreadCount,
    hasUnread,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationsByType,
    getRecentNotifications,
    isMarkingAsRead: markAsReadMutation.isPending,
  };
}

// Hook for displaying toast notifications for specific types
export function useNotificationToasts(userId?: string) {
  const { toast } = useToast();

  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === "notification") {
      const notification = message.data;
      
      // Customize toast based on notification type
      switch (notification.type) {
        case "application_update":
          toast({
            title: "Application Update",
            description: notification.message,
            duration: 7000,
          });
          break;
        
        case "deadline":
          toast({
            title: "⏰ Deadline Reminder",
            description: notification.message,
            duration: 10000,
            variant: "destructive",
          });
          break;
        
        case "message":
          toast({
            title: "💬 New Message",
            description: notification.message,
            duration: 5000,
          });
          break;
        
        case "system":
          toast({
            title: "🔔 System Notification",
            description: notification.message,
            duration: 6000,
          });
          break;
        
        default:
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
      }
    } else if (message.type === "application_update") {
      toast({
        title: "Application Status Changed",
        description: `Your application has been updated`,
        duration: 7000,
      });
    }
  }, [toast]);

  useWebSocket({
    onMessage: handleWebSocketMessage,
    userId,
    autoReconnect: true,
  });
}
