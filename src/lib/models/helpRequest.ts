// @ts-ignore
import { supabase } from '../supabaseClient.js';
import type { HelpRequestData, RequestFilters } from '../types/database.js';

export class HelpRequest {
  request_id: string | null;
  mentee_id: string | null;
  title: string;
  course_code: string;
  description: string;
  preferred_time: string | null;
  budget: number | null;
  status: 'Open' | 'Assigned' | 'Closed';
  created_at: string | null;
  updated_at: string | null;

  constructor(data: HelpRequestData = {}) {
    this.request_id = data.request_id || null;
    this.mentee_id = data.mentee_id || null;
    this.title = data.title || '';
    this.course_code = data.course_code || '';
    this.description = data.description || '';
    this.preferred_time = data.preferred_time || null;
    this.budget = data.budget || null;
    this.status = data.status || 'Open';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  // Create a new help request
  static async create(requestData: HelpRequestData): Promise<HelpRequest> {
    try {
      const { data, error } = await supabase
        .from('help_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) throw error;
      return new HelpRequest(data);
    } catch (error) {
      console.error('Error creating help request:', error);
      throw error;
    }
  }

  // Get help request by ID
  static async getById(requestId: string): Promise<HelpRequest> {
    try {
      const { data, error } = await supabase
        .from('help_requests')
        .select(`
          *,
          mentee:users!help_requests_mentee_id_fkey(*)
        `)
        .eq('request_id', requestId)
        .single();

      if (error) throw error;
      return new HelpRequest(data);
    } catch (error) {
      console.error('Error fetching help request:', error);
      throw error;
    }
  }

  // Get all help requests with filters
  static async getAll(filters: RequestFilters = {}): Promise<HelpRequest[]> {
    try {
      let query = supabase
        .from('help_requests')
        .select(`
          *,
          mentee:users!help_requests_mentee_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.course_code) {
        query = query.eq('course_code', filters.course_code);
      }
      if (filters.department) {
        query = query.eq('mentee.department', filters.department);
      }
      if (filters.max_budget) {
        query = query.lte('budget', filters.max_budget);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((request: any) => new HelpRequest(request));
    } catch (error) {
      console.error('Error fetching help requests:', error);
      throw error;
    }
  }

  // Get help requests by mentee
  static async getByMentee(menteeId: string): Promise<HelpRequest[]> {
    try {
      const { data, error } = await supabase
        .from('help_requests')
        .select('*')
        .eq('mentee_id', menteeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((request: any) => new HelpRequest(request));
    } catch (error) {
      console.error('Error fetching mentee requests:', error);
      throw error;
    }
  }

  // Get open help requests (for mentors to browse)
  static async getOpenRequests(filters: RequestFilters = {}): Promise<HelpRequest[]> {
    try {
      let query = supabase
        .from('help_requests')
        .select(`
          *,
          mentee:users!help_requests_mentee_id_fkey(*)
        `)
        .eq('status', 'Open')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.course_code) {
        query = query.eq('course_code', filters.course_code);
      }
      if (filters.department) {
        query = query.eq('mentee.department', filters.department);
      }
      if (filters.max_budget) {
        query = query.lte('budget', filters.max_budget);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((request: any) => new HelpRequest(request));
    } catch (error) {
      console.error('Error fetching open requests:', error);
      throw error;
    }
  }

  // Update help request
  async update(updateData: Partial<HelpRequestData>): Promise<HelpRequest> {
    try {
      const { data, error } = await supabase
        .from('help_requests')
        .update(updateData)
        .eq('request_id', this.request_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('Error updating help request:', error);
      throw error;
    }
  }

  // Close help request
  async close(): Promise<HelpRequest> {
    try {
      return await this.update({ status: 'Closed' });
    } catch (error) {
      console.error('Error closing help request:', error);
      throw error;
    }
  }

  // Assign help request (when an offer is accepted)
  async assign(): Promise<HelpRequest> {
    try {
      return await this.update({ status: 'Assigned' });
    } catch (error) {
      console.error('Error assigning help request:', error);
      throw error;
    }
  }

  // Get offers for this request
  async getOffers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          mentor:users!help_offers_mentor_id_fkey(*)
        `)
        .eq('request_id', this.request_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  }

  // Get accepted offer for this request
  async getAcceptedOffer(): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          mentor:users!help_offers_mentor_id_fkey(*)
        `)
        .eq('request_id', this.request_id)
        .eq('status', 'Accepted')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching accepted offer:', error);
      throw error;
    }
  }

  // Delete help request
  async delete(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('help_requests')
        .delete()
        .eq('request_id', this.request_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting help request:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON(): HelpRequestData {
    return {
      request_id: this.request_id,
      mentee_id: this.mentee_id,
      title: this.title,
      course_code: this.course_code,
      description: this.description,
      preferred_time: this.preferred_time,
      budget: this.budget,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
