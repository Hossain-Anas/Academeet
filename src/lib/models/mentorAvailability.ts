// @ts-ignore
import { supabase } from '../supabaseClient';
import type { MentorAvailabilityData } from '../types/database';

export class MentorAvailability {
  availability_id: string | null;
  mentor_id: string | null;
  day_of_week: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string | null;

  constructor(data: MentorAvailabilityData = {}) {
    this.availability_id = data.availability_id || null;
    this.mentor_id = data.mentor_id || null;
    this.day_of_week = data.day_of_week || null;
    this.start_time = data.start_time || null;
    this.end_time = data.end_time || null;
    this.created_at = data.created_at || null;
  }

  // Create a new availability slot
  static async create(availabilityData: MentorAvailabilityData): Promise<MentorAvailability> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .insert([availabilityData])
        .select()
        .single();

      if (error) throw error;
      return new MentorAvailability(data);
    } catch (error) {
      console.error('Error creating mentor availability:', error);
      throw error;
    }
  }

  // Create multiple availability slots
  static async createMultiple(availabilityDataArray: MentorAvailabilityData[]): Promise<MentorAvailability[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .insert(availabilityDataArray)
        .select();

      if (error) throw error;
      return data.map((availability: any) => new MentorAvailability(availability));
    } catch (error) {
      console.error('Error creating multiple mentor availability:', error);
      throw error;
    }
  }

  // Get availability by ID
  static async getById(availabilityId: string): Promise<MentorAvailability> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .select(`
          *,
          mentor:users!mentor_availability_mentor_id_fkey(*)
        `)
        .eq('availability_id', availabilityId)
        .single();

      if (error) throw error;
      return new MentorAvailability(data);
    } catch (error) {
      console.error('Error fetching mentor availability:', error);
      throw error;
    }
  }

  // Get availability for a mentor
  static async getByMentor(mentorId: string): Promise<MentorAvailability[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data.map((availability: any) => new MentorAvailability(availability));
    } catch (error) {
      console.error('Error fetching mentor availability:', error);
      throw error;
    }
  }

  // Get availability for a specific day
  static async getByDay(mentorId: string, dayOfWeek: string): Promise<MentorAvailability[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('day_of_week', dayOfWeek)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data.map((availability: any) => new MentorAvailability(availability));
    } catch (error) {
      console.error('Error fetching availability by day:', error);
      throw error;
    }
  }

  // Get all available mentors for a specific day and time
  static async getAvailableMentors(dayOfWeek: string, time: string): Promise<MentorAvailability[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .select(`
          *,
          mentor:users!mentor_availability_mentor_id_fkey(*)
        `)
        .eq('day_of_week', dayOfWeek)
        .lte('start_time', time)
        .gte('end_time', time);

      if (error) throw error;
      return data.map((availability: any) => new MentorAvailability(availability));
    } catch (error) {
      console.error('Error fetching available mentors:', error);
      throw error;
    }
  }

  // Update availability
  async update(updateData: Partial<MentorAvailabilityData>): Promise<MentorAvailability> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .update(updateData)
        .eq('availability_id', this.availability_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('Error updating mentor availability:', error);
      throw error;
    }
  }

  // Delete availability
  async delete(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_availability')
        .delete()
        .eq('availability_id', this.availability_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting mentor availability:', error);
      throw error;
    }
  }

  // Delete all availability for a mentor
  static async deleteByMentor(mentorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_availability')
        .delete()
        .eq('mentor_id', mentorId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting mentor availability:', error);
      throw error;
    }
  }

  // Check if time slot is available (considering existing bookings)
  async isTimeSlotAvailable(date: string, startTime: string, endTime: string): Promise<boolean> {
    try {
      // Convert day of week to actual date
      const targetDate = new Date(date);
      const dayOfWeek = MentorAvailability.getDayOfWeekString(targetDate.getDay());
      
      if (dayOfWeek !== this.day_of_week) {
        return false;
      }

      // Check if the requested time falls within this availability slot
      if (!this.start_time || !this.end_time) return false;
      if (startTime < this.start_time || endTime > this.end_time) {
        return false;
      }

      // Check for existing bookings that conflict
      const { data: conflictingBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('mentor_id', this.mentor_id)
        .eq('status', 'Scheduled')
        .gte('session_time', `${date}T00:00:00`)
        .lt('session_time', `${date}T23:59:59`);

      if (error) throw error;

      // Check for time conflicts
      for (const booking of conflictingBookings) {
        const bookingStart = new Date(booking.session_time);
        const bookingEnd = new Date(bookingStart.getTime() + (booking.duration_minutes * 60000));
        
        const requestedStart = new Date(`${date}T${startTime}`);
        const requestedEnd = new Date(`${date}T${endTime}`);

        if (requestedStart.getTime() < bookingEnd.getTime() && requestedEnd.getTime() > bookingStart.getTime()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      throw error;
    }
  }

  // Get available time slots for a specific date
  static async getAvailableTimeSlots(mentorId: string, date: string, durationMinutes: number = 60): Promise<{ start_time: string; end_time: string; duration_minutes: number }[]> {
    try {
      const targetDate = new Date(date);
      const dayOfWeek = MentorAvailability.getDayOfWeekString(targetDate.getDay());
      
      // Get mentor's availability for this day
      const availability = await MentorAvailability.getByDay(mentorId, dayOfWeek);
      
      if (availability.length === 0) {
        return [];
      }

      // Get existing bookings for this date
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('status', 'Scheduled')
        .gte('session_time', `${date}T00:00:00`)
        .lt('session_time', `${date}T23:59:59`);

      if (error) throw error;

      const availableSlots: { start_time: string; end_time: string; duration_minutes: number }[] = [];

      for (const slot of availability) {
        if (!slot.start_time || !slot.end_time) continue;
        
        const startTime = new Date(`${date}T${slot.start_time}`);
        const endTime = new Date(`${date}T${slot.end_time}`);
        
        // Generate time slots within this availability window
        let currentTime = new Date(startTime);
        
        while (currentTime.getTime() + (durationMinutes * 60000) <= endTime.getTime()) {
          const slotEnd = new Date(currentTime.getTime() + (durationMinutes * 60000));
          
          // Check if this slot conflicts with existing bookings
          let hasConflict = false;
          for (const booking of existingBookings) {
            const bookingStart = new Date(booking.session_time);
            const bookingEnd = new Date(bookingStart.getTime() + (booking.duration_minutes * 60000));
            
            if (currentTime.getTime() < bookingEnd.getTime() && slotEnd.getTime() > bookingStart.getTime()) {
              hasConflict = true;
              break;
            }
          }
          
          if (!hasConflict) {
            availableSlots.push({
              start_time: currentTime.toISOString(),
              end_time: slotEnd.toISOString(),
              duration_minutes: durationMinutes
            });
          }
          
          // Move to next slot (increment by 30 minutes)
          currentTime = new Date(currentTime.getTime() + (30 * 60000));
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      throw error;
    }
  }

  // Helper method to convert day number to day string
  static getDayOfWeekString(dayNumber: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNumber];
  }

  // Helper method to convert day string to day number
  static getDayOfWeekNumber(dayString: string): number {
    const days: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    return days[dayString];
  }

  // Get duration in hours
  getDurationInHours(): number {
    if (!this.start_time || !this.end_time) return 0;
    const start = new Date(`2000-01-01T${this.start_time}`);
    const end = new Date(`2000-01-01T${this.end_time}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  // Check if availability is valid
  isValid(): boolean {
    if (!this.start_time || !this.end_time) return false;
    return this.start_time < this.end_time;
  }

  // Convert to JSON
  toJSON(): MentorAvailabilityData {
    return {
      availability_id: this.availability_id,
      mentor_id: this.mentor_id,
      day_of_week: this.day_of_week,
      start_time: this.start_time,
      end_time: this.end_time,
      created_at: this.created_at
    };
  }
}
