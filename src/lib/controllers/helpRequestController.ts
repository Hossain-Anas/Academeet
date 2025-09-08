// @ts-ignore
import { supabase } from '../supabaseClient';
import { HelpRequest } from '../models/helpRequest';
import { Notification } from '../models/notification';
import type { HelpRequestData } from '../types/database';

// Interface for creating help request
interface CreateHelpRequestData {
  mentee_id: string;
  title: string;
  course_code?: string;
  description: string;
  preferred_time?: string;
  budget?: number;
  duration_minutes?: number;
}

// Interface for updating help request
interface UpdateHelpRequestData {
  title?: string;
  course_code?: string;
  description?: string;
  preferred_time?: string;
  budget?: number;
  status?: 'Open' | 'Assigned' | 'Closed';
}

// Interface for help request filters
interface HelpRequestFilters {
  mentee_id?: string;
  status?: 'Open' | 'Assigned' | 'Closed';
  course_code?: string;
  department?: string;
  skills?: string[];
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'preferred_time' | 'budget';
  sort_order?: 'asc' | 'desc';
}

export class HelpRequestController {
  // Create a new help request
  static async createHelpRequest(requestData: CreateHelpRequestData): Promise<HelpRequestData> {
    try {
      const { mentee_id, title, course_code, description, preferred_time, budget, duration_minutes } = requestData;

      // Validate required fields
      if (!mentee_id || !title || !description) {
        throw new Error('Mentee ID, title, and description are required');
      }

      // Create the help request
      const helpRequest = await HelpRequest.create({
        mentee_id,
        title,
        course_code,
        description,
        preferred_time: preferred_time || null,
        budget: budget || null,
        duration_minutes: duration_minutes || 30
      });

      return helpRequest.toJSON();
    } catch (error) {
      console.error('Create help request error:', error);
      throw error;
    }
  }

  // Get help request by ID
  static async getHelpRequestById(requestId: string): Promise<HelpRequestData> {
    try {
      const helpRequest = await HelpRequest.getById(requestId);
      return helpRequest.toJSON();
    } catch (error) {
      console.error('Get help request error:', error);
      throw error;
    }
  }

  // Get all help requests with optional filters
  static async getHelpRequests(filters: HelpRequestFilters = {}): Promise<HelpRequestData[]> {
    try {
      const helpRequests = await HelpRequest.getAll(filters);
      return helpRequests.map(request => request.toJSON());
    } catch (error) {
      console.error('Get help requests error:', error);
      throw error;
    }
  }

  // Get help requests by mentee
  static async getHelpRequestsByMentee(menteeId: string): Promise<HelpRequestData[]> {
    try {
      const helpRequests = await HelpRequest.getByMentee(menteeId);
      return helpRequests.map(request => request.toJSON());
    } catch (error) {
      console.error('Get help requests by mentee error:', error);
      throw error;
    }
  }

  // Update help request
  static async updateHelpRequest(requestId: string, updateData: UpdateHelpRequestData): Promise<HelpRequestData> {
    try {
      const helpRequest = await HelpRequest.getById(requestId);
      const updatedRequest = await helpRequest.update(updateData);

      // Send notification if status changed
      if (updateData.status && updateData.status !== helpRequest.status) {
        await Notification.create({
          user_id: helpRequest.mentee_id,
          message: `Your help request "${helpRequest.title}" status has been updated to ${updateData.status}.`,
          type: 'Request'
        });
      }

      return updatedRequest.toJSON();
    } catch (error) {
      console.error('Update help request error:', error);
      throw error;
    }
  }

  // Delete help request
  static async deleteHelpRequest(requestId: string, userId: string): Promise<void> {
    try {
      const helpRequest = await HelpRequest.getById(requestId);
      
      // Check if user owns the request
      if (helpRequest.mentee_id !== userId) {
        throw new Error('You can only delete your own help requests');
      }

      await helpRequest.delete();
    } catch (error) {
      console.error('Delete help request error:', error);
      throw error;
    }
  }

  // Get open help requests (for mentors to browse)
  static async getOpenHelpRequests(filters: HelpRequestFilters = {}): Promise<HelpRequestData[]> {
    try {
      const helpRequests = await HelpRequest.getOpenRequests(filters);
      return helpRequests.map(request => request.toJSON());
    } catch (error) {
      console.error('Get open help requests error:', error);
      throw error;
    }
  }

  // Close help request
  static async closeHelpRequest(requestId: string, userId: string): Promise<HelpRequestData> {
    try {
      const helpRequest = await HelpRequest.getById(requestId);
      
      // Check if user owns the request
      if (helpRequest.mentee_id !== userId) {
        throw new Error('You can only close your own help requests');
      }

      const updatedRequest = await helpRequest.close();
      return updatedRequest.toJSON();
    } catch (error) {
      console.error('Close help request error:', error);
      throw error;
    }
  }

  // Assign help request (when an offer is accepted)
  static async assignHelpRequest(requestId: string): Promise<HelpRequestData> {
    try {
      const helpRequest = await HelpRequest.getById(requestId);
      const updatedRequest = await helpRequest.assign();
      return updatedRequest.toJSON();
    } catch (error) {
      console.error('Assign help request error:', error);
      throw error;
    }
  }

  // Get offers for a help request
  static async getOffersForRequest(requestId: string): Promise<any[]> {
    try {
      const helpRequest = await HelpRequest.getById(requestId);
      return await helpRequest.getOffers();
    } catch (error) {
      console.error('Get offers for request error:', error);
      throw error;
    }
  }

  // Get accepted offer for a help request
  static async getAcceptedOfferForRequest(requestId: string): Promise<any | null> {
    try {
      const helpRequest = await HelpRequest.getById(requestId);
      return await helpRequest.getAcceptedOffer();
    } catch (error) {
      console.error('Get accepted offer for request error:', error);
      throw error;
    }
  }

}
