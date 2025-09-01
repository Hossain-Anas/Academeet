// @ts-ignore
import { supabase } from '../supabaseClient.js';
import type { BookingData } from '../types/database.js';

export class Booking {
  booking_id: string | null;
  mentee_id: string | null;
  mentor_id: string | null;
  request_id: string | null;
  offer_id: string | null;
  session_time: string | null;
  duration_minutes: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-show';
  created_at: string | null;
  updated_at: string | null;

  constructor(data: BookingData = {}) {
    this.booking_id = data.booking_id || null;
    this.mentee_id = data.mentee_id || null;
    this.mentor_id = data.mentor_id || null;
    this.request_id = data.request_id || null;
    this.offer_id = data.offer_id || null;
    this.session_time = data.session_time || null;
    this.duration_minutes = data.duration_minutes || 60;
    this.status = data.status || 'Scheduled';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  // Create a new booking
  static async create(bookingData: BookingData): Promise<Booking> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;
      return new Booking(data);
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Get booking by ID
  static async getById(bookingId: string): Promise<Booking> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          mentee:users!bookings_mentee_id_fkey(*),
          mentor:users!bookings_mentor_id_fkey(*),
          request:help_requests!bookings_request_id_fkey(*),
          offer:help_offers!bookings_offer_id_fkey(*)
        `)
        .eq('booking_id', bookingId)
        .single();

      if (error) throw error;
      return new Booking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  // Get bookings by user (both as mentee and mentor)
  static async getByUser(userId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          mentee:users!bookings_mentee_id_fkey(*),
          mentor:users!bookings_mentor_id_fkey(*),
          request:help_requests!bookings_request_id_fkey(*),
          offer:help_offers!bookings_offer_id_fkey(*)
        `)
        .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)
        .order('session_time', { ascending: false });

      if (error) throw error;
      return data.map((booking: any) => new Booking(booking));
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  }

  // Get bookings by mentee
  static async getByMentee(menteeId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          mentor:users!bookings_mentor_id_fkey(*),
          request:help_requests!bookings_request_id_fkey(*),
          offer:help_offers!bookings_offer_id_fkey(*)
        `)
        .eq('mentee_id', menteeId)
        .order('session_time', { ascending: false });

      if (error) throw error;
      return data.map((booking: any) => new Booking(booking));
    } catch (error) {
      console.error('Error fetching mentee bookings:', error);
      throw error;
    }
  }

  // Get bookings by mentor
  static async getByMentor(mentorId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          mentee:users!bookings_mentee_id_fkey(*),
          request:help_requests!bookings_request_id_fkey(*),
          offer:help_offers!bookings_offer_id_fkey(*)
        `)
        .eq('mentor_id', mentorId)
        .order('session_time', { ascending: false });

      if (error) throw error;
      return data.map((booking: any) => new Booking(booking));
    } catch (error) {
      console.error('Error fetching mentor bookings:', error);
      throw error;
    }
  }

  // Get upcoming bookings for a user
  static async getUpcoming(userId: string): Promise<Booking[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          mentee:users!bookings_mentee_id_fkey(*),
          mentor:users!bookings_mentor_id_fkey(*),
          request:help_requests!bookings_request_id_fkey(*),
          offer:help_offers!bookings_offer_id_fkey(*)
        `)
        .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)
        .eq('status', 'Scheduled')
        .gte('session_time', now)
        .order('session_time', { ascending: true });

      if (error) throw error;
      return data.map((booking: any) => new Booking(booking));
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      throw error;
    }
  }

  // Get completed bookings for a user
  static async getCompleted(userId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          mentee:users!bookings_mentee_id_fkey(*),
          mentor:users!bookings_mentor_id_fkey(*),
          request:help_requests!bookings_request_id_fkey(*),
          offer:help_offers!bookings_offer_id_fkey(*)
        `)
        .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)
        .eq('status', 'Completed')
        .order('session_time', { ascending: false });

      if (error) throw error;
      return data.map((booking: any) => new Booking(booking));
    } catch (error) {
      console.error('Error fetching completed bookings:', error);
      throw error;
    }
  }

  // Get bookings by status
  static async getByStatus(status: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          mentee:users!bookings_mentee_id_fkey(*),
          mentor:users!bookings_mentor_id_fkey(*),
          request:help_requests!bookings_request_id_fkey(*),
          offer:help_offers!bookings_offer_id_fkey(*)
        `)
        .eq('status', status)
        .order('session_time', { ascending: false });

      if (error) throw error;
      return data.map((booking: any) => new Booking(booking));
    } catch (error) {
      console.error('Error fetching bookings by status:', error);
      throw error;
    }
  }

  // Update booking
  async update(updateData: Partial<BookingData>): Promise<Booking> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('booking_id', this.booking_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  // Mark booking as completed
  async complete(): Promise<Booking> {
    try {
      return await this.update({ status: 'Completed' });
    } catch (error) {
      console.error('Error completing booking:', error);
      throw error;
    }
  }

  // Cancel booking
  async cancel(): Promise<Booking> {
    try {
      return await this.update({ status: 'Cancelled' });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Mark as no-show
  async markNoShow(): Promise<Booking> {
    try {
      return await this.update({ status: 'No-show' });
    } catch (error) {
      console.error('Error marking no-show:', error);
      throw error;
    }
  }

  // Reschedule booking
  async reschedule(newSessionTime: string): Promise<Booking> {
    try {
      return await this.update({ session_time: newSessionTime });
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      throw error;
    }
  }

  // Check if booking can be cancelled (e.g., not within 24 hours)
  canBeCancelled(): boolean {
    if (this.status !== 'Scheduled' || !this.session_time) return false;
    
    const sessionTime = new Date(this.session_time);
    const now = new Date();
    const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilSession > 24;
  }

  // Check if booking is upcoming (within next 24 hours)
  isUpcoming(): boolean {
    if (this.status !== 'Scheduled' || !this.session_time) return false;
    
    const sessionTime = new Date(this.session_time);
    const now = new Date();
    const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilSession <= 24 && hoursUntilSession > 0;
  }

  // Get booking duration in hours
  getDurationInHours(): number {
    return this.duration_minutes / 60;
  }

  // Delete booking
  async delete(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('booking_id', this.booking_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON(): BookingData {
    return {
      booking_id: this.booking_id,
      mentee_id: this.mentee_id,
      mentor_id: this.mentor_id,
      request_id: this.request_id,
      offer_id: this.offer_id,
      session_time: this.session_time,
      duration_minutes: this.duration_minutes,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
