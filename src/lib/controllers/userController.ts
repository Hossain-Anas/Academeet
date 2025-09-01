// @ts-ignore
import { supabase } from '../supabaseClient.js';
import { User } from '../models/user.js';
import { MentorAvailability } from '../models/mentorAvailability.js';
import { Notification } from '../models/notification.js';
import type { UserData, MentorAvailabilityData } from '../types/database.js';

// Interface for user profile update
interface UserProfileUpdate {
  name?: string;
  department?: string;
  semester?: string;
  skills?: string[];
  interests?: string[];
}

// Interface for mentor filters
interface MentorFilters {
  department?: string;
  skills?: string[];
  minRating?: number;
  limit?: number;
  offset?: number;
}

// Interface for availability data
interface AvailabilityData {
  day_of_week: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  start_time: string;
  end_time: string;
}

export class UserController {
  // Get user profile by ID
  static async getUserProfile(userId: string): Promise<UserData> {
    try {
      const user = await User.getById(userId);
      return user.toJSON();
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, profileData: UserProfileUpdate): Promise<UserData> {
    try {
      const user = await User.getById(userId);
      const updatedUser = await user.update(profileData);
      
      // Send notification about profile update
      await Notification.create({
        user_id: userId,
        message: 'Your profile has been updated successfully.',
        type: 'Request'
      });

      return updatedUser.toJSON();
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  // Get all mentors with optional filters
  static async getMentors(filters: MentorFilters = {}): Promise<UserData[]> {
    try {
      const mentors = await User.getMentors(filters);
      return mentors.map(mentor => mentor.toJSON());
    } catch (error) {
      console.error('Get mentors error:', error);
      throw error;
    }
  }

  // Get mentor by ID with availability
  static async getMentorWithAvailability(mentorId: string): Promise<{
    mentor: UserData;
    availability: MentorAvailabilityData[];
    averageRating: number;
    reviewsCount: number;
  }> {
    try {
      const mentor = await User.getById(mentorId);
      const availability = await MentorAvailability.getByMentor(mentorId);
      const averageRating = await mentor.getAverageRating();
      const reviewsCount = await mentor.getReviewsCount();

      return {
        mentor: mentor.toJSON(),
        availability: availability.map(slot => slot.toJSON()),
        averageRating,
        reviewsCount
      };
    } catch (error) {
      console.error('Get mentor with availability error:', error);
      throw error;
    }
  }

  // Toggle user mentor status
  static async toggleMentorStatus(userId: string): Promise<UserData> {
    try {
      const user = await User.getById(userId);
      const updatedUser = await user.toggleMentorStatus();

      // Send notification about role change
      const roleMessage = updatedUser.is_mentor 
        ? 'You are now a mentor! Students can find and book sessions with you.'
        : 'You are now in mentee mode. You can browse and book sessions with mentors.';

      await Notification.create({
        user_id: userId,
        message: roleMessage,
        type: 'Request'
      });

      return updatedUser.toJSON();
    } catch (error) {
      console.error('Toggle mentor status error:', error);
      throw error;
    }
  }

  // Set mentor availability
  static async setMentorAvailability(mentorId: string, availabilityData: AvailabilityData[]): Promise<MentorAvailabilityData[]> {
    try {
      // First, delete existing availability
      await MentorAvailability.deleteByMentor(mentorId);

      // Create new availability slots
      const availabilitySlots = availabilityData.map(slot => ({
        mentor_id: mentorId,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time
      }));

      const newAvailability = await MentorAvailability.createMultiple(availabilitySlots);

      // Send notification about availability update
      await Notification.create({
        user_id: mentorId,
        message: 'Your availability has been updated successfully.',
        type: 'Request'
      });

      return newAvailability.map(slot => slot.toJSON());
    } catch (error) {
      console.error('Set mentor availability error:', error);
      throw error;
    }
  }

  // Get mentor availability
  static async getMentorAvailability(mentorId: string): Promise<MentorAvailabilityData[]> {
    try {
      const availability = await MentorAvailability.getByMentor(mentorId);
      return availability.map(slot => slot.toJSON());
    } catch (error) {
      console.error('Get mentor availability error:', error);
      throw error;
    }
  }

  // Update mentor availability
  static async updateMentorAvailability(availabilityId: string, updateData: Partial<MentorAvailabilityData>): Promise<MentorAvailabilityData> {
    try {
      const availability = await MentorAvailability.getById(availabilityId);
      const updatedAvailability = await availability.update(updateData);
      return updatedAvailability.toJSON();
    } catch (error) {
      console.error('Update mentor availability error:', error);
      throw error;
    }
  }

  // Delete mentor availability slot
  static async deleteMentorAvailability(availabilityId: string): Promise<boolean> {
    try {
      const availability = await MentorAvailability.getById(availabilityId);
      return await availability.delete();
    } catch (error) {
      console.error('Delete mentor availability error:', error);
      throw error;
    }
  }

  // Get available time slots for a mentor on a specific date
  static async getAvailableTimeSlots(mentorId: string, date: string, durationMinutes: number = 60): Promise<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
  }[]> {
    try {
      return await MentorAvailability.getAvailableTimeSlots(mentorId, date, durationMinutes);
    } catch (error) {
      console.error('Get available time slots error:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(userId: string): Promise<{
    isMentor: boolean;
    averageRating: number;
    reviewsCount: number;
    completedSessions: number;
    totalAvailabilitySlots: number;
  }> {
    try {
      const user = await User.getById(userId);
      const averageRating = await user.getAverageRating();
      const reviewsCount = await user.getReviewsCount();
      const completedSessions = await user.getCompletedSessionsCount();
      
      let totalAvailabilitySlots = 0;
      if (user.is_mentor) {
        const availability = await MentorAvailability.getByMentor(userId);
        totalAvailabilitySlots = availability.length;
      }

      return {
        isMentor: user.is_mentor,
        averageRating,
        reviewsCount,
        completedSessions,
        totalAvailabilitySlots
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }

  // Search mentors by skills or department
  static async searchMentors(query: string, filters: MentorFilters = {}): Promise<UserData[]> {
    try {
      // Get all mentors first
      const allMentors = await User.getMentors(filters);
      
      // Filter by search query
      const filteredMentors = allMentors.filter(mentor => {
        const searchTerm = query.toLowerCase();
        return (
          mentor.name.toLowerCase().includes(searchTerm) ||
          mentor.department.toLowerCase().includes(searchTerm) ||
          mentor.skills.some(skill => skill.toLowerCase().includes(searchTerm)) ||
          mentor.interests.some(interest => interest.toLowerCase().includes(searchTerm))
        );
      });

      return filteredMentors.map(mentor => mentor.toJSON());
    } catch (error) {
      console.error('Search mentors error:', error);
      throw error;
    }
  }

  // Get user's completed sessions count
  static async getCompletedSessionsCount(userId: string): Promise<number> {
    try {
      const user = await User.getById(userId);
      return await user.getCompletedSessionsCount();
    } catch (error) {
      console.error('Get completed sessions count error:', error);
      throw error;
    }
  }

  // Get user's average rating
  static async getAverageRating(userId: string): Promise<number> {
    try {
      const user = await User.getById(userId);
      return await user.getAverageRating();
    } catch (error) {
      console.error('Get average rating error:', error);
      throw error;
    }
  }

  // Get user's reviews count
  static async getReviewsCount(userId: string): Promise<number> {
    try {
      const user = await User.getById(userId);
      return await user.getReviewsCount();
    } catch (error) {
      console.error('Get reviews count error:', error);
      throw error;
    }
  }

  // Delete user account
  static async deleteUserAccount(userId: string): Promise<boolean> {
    try {
      const user = await User.getById(userId);
      return await user.delete();
    } catch (error) {
      console.error('Delete user account error:', error);
      throw error;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<UserData | null> {
    try {
      const user = await User.getByEmail(email);
      return user ? user.toJSON() : null;
    } catch (error) {
      console.error('Get user by email error:', error);
      throw error;
    }
  }

  // Check if user is mentor
  static async isMentor(userId: string): Promise<boolean> {
    try {
      const user = await User.getById(userId);
      return user.is_mentor;
    } catch (error) {
      console.error('Check if user is mentor error:', error);
      throw error;
    }
  }

  // Get all users (admin function)
  static async getAllUsers(): Promise<UserData[]> {
    try {
      // This would need to be implemented in the User model
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }
}
