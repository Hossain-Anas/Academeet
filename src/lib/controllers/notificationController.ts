// @ts-ignore
import { supabase } from '../supabaseClient.js';
import { Notification } from '../models/notification.js';
import type { NotificationData } from '../types/database.js';

// Interface for creating notification
interface CreateNotificationData {
  user_id: string;
  message: string;
  type: 'Request' | 'Offer' | 'Booking' | 'Reminder' | 'Review';
}

// Interface for notification filters
interface NotificationFilters {
  type?: 'Request' | 'Offer' | 'Booking' | 'Reminder' | 'Review';
  is_read?: boolean;
  limit?: number;
}

export class NotificationController {
  // Create a new notification
  static async createNotification(notificationData: CreateNotificationData): Promise<NotificationData> {
    try {
      const { user_id, message, type } = notificationData;

      // Validate required fields
      if (!user_id || !message || !type) {
        throw new Error('User ID, message, and type are required');
      }

      // Create the notification
      const notification = await Notification.create({
        user_id,
        message,
        type
      });

      return notification.toJSON();
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Create multiple notifications
  static async createMultipleNotifications(notificationsData: CreateNotificationData[]): Promise<NotificationData[]> {
    try {
      const notifications = await Notification.createMultiple(notificationsData);
      return notifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Create multiple notifications error:', error);
      throw error;
    }
  }

  // Get notification by ID
  static async getNotificationById(notificationId: string): Promise<NotificationData> {
    try {
      const notification = await Notification.getById(notificationId);
      return notification.toJSON();
    } catch (error) {
      console.error('Get notification error:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getNotificationsByUser(userId: string, filters: NotificationFilters = {}): Promise<NotificationData[]> {
    try {
      const options = {
        type: filters.type,
        is_read: filters.is_read,
        limit: filters.limit
      };

      const notifications = await Notification.getByUser(userId, options);
      return notifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Get notifications by user error:', error);
      throw error;
    }
  }

  // Get unread notifications for a user
  static async getUnreadNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const notifications = await Notification.getUnread(userId);
      return notifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Get unread notifications error:', error);
      throw error;
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<NotificationData> {
    try {
      const notification = await Notification.getById(notificationId);
      const updatedNotification = await notification.markAsRead();
      return updatedNotification.toJSON();
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }

  // Mark notification as unread
  static async markNotificationAsUnread(notificationId: string): Promise<NotificationData> {
    try {
      const notification = await Notification.getById(notificationId);
      const updatedNotification = await notification.markAsUnread();
      return updatedNotification.toJSON();
    } catch (error) {
      console.error('Mark notification as unread error:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      return await Notification.markAllAsRead(userId);
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      throw error;
    }
  }

  // Get notifications by type
  static async getNotificationsByType(type: string, options: { user_id?: string; limit?: number } = {}): Promise<NotificationData[]> {
    try {
      const notifications = await Notification.getByType(type, options);
      return notifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Get notifications by type error:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await Notification.getById(notificationId);
      
      // Check if user owns the notification
      if (notification.user_id !== userId) {
        throw new Error('You can only delete your own notifications');
      }

      return await notification.delete();
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  // Delete old notifications
  static async deleteOldNotifications(daysOld: number = 30): Promise<boolean> {
    try {
      return await Notification.deleteOld(daysOld);
    } catch (error) {
      console.error('Delete old notifications error:', error);
      throw error;
    }
  }

  // Create specific notification types
  static async createRequestNotification(userId: string, message: string): Promise<NotificationData> {
    try {
      const notification = await Notification.createRequestNotification(userId, message);
      return notification.toJSON();
    } catch (error) {
      console.error('Create request notification error:', error);
      throw error;
    }
  }

  static async createOfferNotification(userId: string, message: string): Promise<NotificationData> {
    try {
      const notification = await Notification.createOfferNotification(userId, message);
      return notification.toJSON();
    } catch (error) {
      console.error('Create offer notification error:', error);
      throw error;
    }
  }

  static async createBookingNotification(userId: string, message: string): Promise<NotificationData> {
    try {
      const notification = await Notification.createBookingNotification(userId, message);
      return notification.toJSON();
    } catch (error) {
      console.error('Create booking notification error:', error);
      throw error;
    }
  }

  static async createReminderNotification(userId: string, message: string): Promise<NotificationData> {
    try {
      const notification = await Notification.createReminderNotification(userId, message);
      return notification.toJSON();
    } catch (error) {
      console.error('Create reminder notification error:', error);
      throw error;
    }
  }

  static async createReviewNotification(userId: string, message: string): Promise<NotificationData> {
    try {
      const notification = await Notification.createReviewNotification(userId, message);
      return notification.toJSON();
    } catch (error) {
      console.error('Create review notification error:', error);
      throw error;
    }
  }

  // Send notification to mentors
  static async notifyMentors(message: string, options: { excludeUserId?: string; limit?: number } = {}): Promise<NotificationData[]> {
    try {
      // Get all mentors
      let query = supabase
        .from('users')
        .select('user_id')
        .eq('is_mentor', true);

      if (options.excludeUserId) {
        query = query.neq('user_id', options.excludeUserId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: mentors, error } = await query;

      if (error) throw error;

      // Create notifications for all mentors
      const notifications = mentors.map((mentor: any) => ({
        user_id: mentor.user_id,
        message,
        type: 'Request' as const
      }));

      const createdNotifications = await Notification.createMultiple(notifications);
      return createdNotifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Notify mentors error:', error);
      throw error;
    }
  }

  // Send notification to mentees
  static async notifyMentees(message: string, options: { excludeUserId?: string; limit?: number } = {}): Promise<NotificationData[]> {
    try {
      // Get all mentees
      let query = supabase
        .from('users')
        .select('user_id')
        .eq('is_mentor', false);

      if (options.excludeUserId) {
        query = query.neq('user_id', options.excludeUserId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: mentees, error } = await query;

      if (error) throw error;

      // Create notifications for all mentees
      const notifications = mentees.map((mentee: any) => ({
        user_id: mentee.user_id,
        message,
        type: 'Request' as const
      }));

      const createdNotifications = await Notification.createMultiple(notifications);
      return createdNotifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Notify mentees error:', error);
      throw error;
    }
  }

  // Send notification to specific users
  static async notifyUsers(userIds: string[], message: string, type: 'Request' | 'Offer' | 'Booking' | 'Reminder' | 'Review' = 'Request'): Promise<NotificationData[]> {
    try {
      // Create notifications for specific users
      const notifications = userIds.map(userId => ({
        user_id: userId,
        message,
        type
      }));

      const createdNotifications = await Notification.createMultiple(notifications);
      return createdNotifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Notify users error:', error);
      throw error;
    }
  }

  // Send system notification to all users
  static async sendSystemNotification(message: string, options: { excludeUserId?: string; limit?: number } = {}): Promise<NotificationData[]> {
    try {
      // Get all users
      let query = supabase
        .from('users')
        .select('user_id');

      if (options.excludeUserId) {
        query = query.neq('user_id', options.excludeUserId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: users, error } = await query;

      if (error) throw error;

      // Create notifications for all users
      const notifications = users.map((user: any) => ({
        user_id: user.user_id,
        message,
        type: 'Request' as const
      }));

      const createdNotifications = await Notification.createMultiple(notifications);
      return createdNotifications.map(notification => notification.toJSON());
    } catch (error) {
      console.error('Send system notification error:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: { [key: string]: number };
  }> {
    try {
      let total = 0;
      let unread = 0;
      const byType: { [key: string]: number } = {};

      if (userId) {
        // Get user-specific stats
        const allNotifications = await Notification.getByUser(userId);
        total = allNotifications.length;
        unread = allNotifications.filter(n => !n.is_read).length;
        
        // Count by type
        allNotifications.forEach(notification => {
          byType[notification.type] = (byType[notification.type] || 0) + 1;
        });
      } else {
        // Get global stats
        const { data: allNotifications, error } = await supabase
          .from('notifications')
          .select('*');

        if (error) throw error;

        total = allNotifications.length;
        unread = allNotifications.filter((n: any) => !n.is_read).length;
        
        // Count by type
        allNotifications.forEach((notification: any) => {
          byType[notification.type] = (byType[notification.type] || 0) + 1;
        });
      }

      return { total, unread, byType };
    } catch (error) {
      console.error('Get notification stats error:', error);
      throw error;
    }
  }

  // Clean up old notifications (utility method)
  static async cleanupOldNotifications(daysOld: number = 30): Promise<boolean> {
    try {
      return await Notification.deleteOld(daysOld);
    } catch (error) {
      console.error('Cleanup old notifications error:', error);
      throw error;
    }
  }

  // Get notification icon
  static getNotificationIcon(type: 'Request' | 'Offer' | 'Booking' | 'Reminder' | 'Review'): string {
    const icons: { [key: string]: string } = {
      'Request': '📝',
      'Offer': '💼',
      'Booking': '📅',
      'Reminder': '⏰',
      'Review': '⭐'
    };
    return icons[type] || '🔔';
  }

  // Check if notification is recent
  static isNotificationRecent(createdAt: string): boolean {
    if (!createdAt) return false;
    const notificationDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }
}
