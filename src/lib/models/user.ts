// @ts-ignore
import { supabase } from '../supabaseClient.js';
import type { UserData, MentorFilters } from '../types/database.js';

export class User {
  user_id: string | null;
  name: string;
  email: string;
  department: string;
  semester: string;
  skills: string[];
  interests: string[];
  is_mentor: boolean;
  created_at: string | null;
  updated_at: string | null;

  constructor(data: UserData = {}) {
    this.user_id = data.user_id || null;
    this.name = data.name || '';
    this.email = data.email || '';
    this.department = data.department || '';
    this.semester = data.semester || '';
    this.skills = data.skills || [];
    this.interests = data.interests || [];
    this.is_mentor = data.is_mentor || false;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  // Create a new user
  static async create(userData: UserData): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return new User(data);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getById(userId: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return new User(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Get user by email
  static async getByEmail(email: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return new User(data);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  // Get all mentors
  static async getMentors(filters: MentorFilters = {}): Promise<User[]> {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('is_mentor', true);

      // Apply filters
      if (filters.department) {
        query = query.eq('department', filters.department);
      }
      if (filters.skills && filters.skills.length > 0) {
        query = query.contains('skills', filters.skills);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((user: any) => new User(user));
    } catch (error) {
      console.error('Error fetching mentors:', error);
      throw error;
    }
  }

  // Update user
  async update(updateData: Partial<UserData>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', this.user_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Toggle mentor status
  async toggleMentorStatus(): Promise<User> {
    try {
      return await this.update({ is_mentor: !this.is_mentor });
    } catch (error) {
      console.error('Error toggling mentor status:', error);
      throw error;
    }
  }

  // Get user's average rating (if they're a mentor)
  async getAverageRating(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_user_id', this.user_id);

      if (error) throw error;
      
      if (data.length === 0) return 0;
      
      const sum = data.reduce((acc: number, review: any) => acc + review.rating, 0);
      return parseFloat((sum / data.length).toFixed(1));
    } catch (error) {
      console.error('Error fetching user rating:', error);
      throw error;
    }
  }

  // Get user's total reviews count
  async getReviewsCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('review_id', { count: 'exact' })
        .eq('reviewed_user_id', this.user_id);

      if (error) throw error;
      return data.length;
    } catch (error) {
      console.error('Error fetching reviews count:', error);
      throw error;
    }
  }

  // Get user's completed sessions count
  async getCompletedSessionsCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_id', { count: 'exact' })
        .eq('status', 'Completed')
        .or(`mentee_id.eq.${this.user_id},mentor_id.eq.${this.user_id}`);

      if (error) throw error;
      return data.length;
    } catch (error) {
      console.error('Error fetching completed sessions count:', error);
      throw error;
    }
  }

  // Delete user
  async delete(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', this.user_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON(): UserData {
    return {
      user_id: this.user_id,
      name: this.name,
      email: this.email,
      department: this.department,
      semester: this.semester,
      skills: this.skills,
      interests: this.interests,
      is_mentor: this.is_mentor,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
