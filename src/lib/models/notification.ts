// @ts-ignore
import { supabase } from '../supabaseClient.js';
import type { NotificationData } from '../types/database.js';

export class Notification {
  notification_id: string | null;
  user_id: string | null;
  message: string;
  type: 'Request' | 'Offer' | 'Booking' | 'Reminder' | 'Review';
  is_read: boolean;
  created_at: string | null;

  constructor(data: NotificationData = {}) {
    this.notification_id = data.notification_id || null;
    this.user_id = data.user_id || null;
    this.message = data.message || '';
    this.type = data.type || 'Request';
    this.is_read = data.is_read || false;
    this.created_at = data.created_at || null;
  }

  // Create a new notification
  static async create(notificationData: NotificationData): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) throw error;
      return new Notification(data);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create multiple notifications
  static async createMultiple(notificationsData: NotificationData[]): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationsData)
        .select();

      if (error) throw error;
      return data.map((notification: any) => new Notification(notification));
    } catch (error) {
      console.error('Error creating multiple notifications:', error);
      throw error;
    }
  }

  // Get notification by ID
  static async getById(notificationId: string): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .single();

      if (error) throw error;
      return new Notification(data);
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getByUser(userId: string, options: { type?: string; is_read?: boolean; limit?: number } = {}): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.type) {
        query = query.eq('type', options.type);
      }
      if (options.is_read !== undefined) {
        query = query.eq('is_read', options.is_read);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((notification: any) => new Notification(notification));
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Get unread notifications for a user
  static async getUnread(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((notification: any) => new Notification(notification));
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Get notifications by type
  static async getByType(type: string, options: { user_id?: string; limit?: number } = {}): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (options.user_id) {
        query = query.eq('user_id', options.user_id);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((notification: any) => new Notification(notification));
    } catch (error) {
      console.error('Error fetching notifications by type:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('notification_id', this.notification_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      this.is_read = true;
      return this;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark notification as unread
  async markAsUnread(): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: false })
        .eq('notification_id', this.notification_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      this.is_read = false;
      return this;
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async delete(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', this.notification_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete old notifications (older than specified days)
  static async deleteOld(daysOld: number = 30): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }

  // Helper methods for creating specific notification types
  static async createRequestNotification(userId: string, message: string): Promise<Notification> {
    return await Notification.create({
      user_id: userId,
      message: message,
      type: 'Request'
    });
  }

  static async createOfferNotification(userId: string, message: string): Promise<Notification> {
    return await Notification.create({
      user_id: userId,
      message: message,
      type: 'Offer'
    });
  }

  static async createBookingNotification(userId: string, message: string): Promise<Notification> {
    return await Notification.create({
      user_id: userId,
      message: message,
      type: 'Booking'
    });
  }

  static async createReminderNotification(userId: string, message: string): Promise<Notification> {
    return await Notification.create({
      user_id: userId,
      message: message,
      type: 'Reminder'
    });
  }

  static async createReviewNotification(userId: string, message: string): Promise<Notification> {
    return await Notification.create({
      user_id: userId,
      message: message,
      type: 'Review'
    });
  }

  // Check if notification is recent (within last 24 hours)
  isRecent(): boolean {
    if (!this.created_at) return false;
    const notificationDate = new Date(this.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }

  // Get notification icon based on type
  getIcon(): string {
    const icons: { [key: string]: string } = {
      'Request': '📝',
      'Offer': '💼',
      'Booking': '📅',
      'Reminder': '⏰',
      'Review': '⭐'
    };
    return icons[this.type] || '🔔';
  }

  // Convert to JSON
  toJSON(): NotificationData {
    return {
      notification_id: this.notification_id,
      user_id: this.user_id,
      message: this.message,
      type: this.type,
      is_read: this.is_read,
      created_at: this.created_at
    };
  }
}
