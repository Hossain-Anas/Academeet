// @ts-ignore
import { supabase } from '../supabaseClient';
import type { HelpOfferData } from '../types/database';

export class HelpOffer {
  offer_id: string | null;
  request_id: string | null;
  mentor_id: string | null;
  proposed_time: string | null;
  proposed_fee: number | null;
  message: string;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Withdrawn';
  created_at: string | null;
  updated_at: string | null;

  constructor(data: HelpOfferData = {}) {
    this.offer_id = data.offer_id || null;
    this.request_id = data.request_id || null;
    this.mentor_id = data.mentor_id || null;
    this.proposed_time = data.proposed_time || null;
    this.proposed_fee = data.proposed_fee || null;
    this.message = data.message || '';
    this.status = data.status || 'Pending';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  // Create a new help offer
  static async create(offerData: HelpOfferData): Promise<HelpOffer> {
    try {
      // First, create the offer
      const { data: offer, error } = await supabase
        .from('help_offers')
        .insert([{
          ...offerData,
          status: 'Pending'
        }])
        .select()
        .single();

      if (error) throw error;

      // Get the request and mentee info
      const { data: request, error: requestError } = await supabase
        .from('help_requests')
        .select(`
          *,
          mentee:users!help_requests_mentee_id_fkey(*)
        `)
        .eq('request_id', offerData.request_id)
        .single();

      if (requestError) throw requestError;

      // Get mentor info
      const { data: mentor, error: mentorError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', offerData.mentor_id)
        .single();

      if (mentorError) throw mentorError;

      // Create a pending booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          mentee_id: request.mentee.user_id,
          mentor_id: offerData.mentor_id,
          request_id: offerData.request_id,
          offer_id: offer.offer_id,
          session_time: offerData.proposed_time || new Date().toISOString(),
          duration_minutes: 60,
          status: 'Pending'
        });

      if (bookingError) throw bookingError;

      // Create notifications for both parties
      const notifications = [
        {
          user_id: request.mentee.user_id,
          message: `New offer from ${mentor.name} for "${request.title}"`,
          type: 'Offer'
        },
        {
          user_id: offerData.mentor_id,
          message: `You made an offer on "${request.title}". Awaiting response.`,
          type: 'Offer'
        }
      ];

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      return new HelpOffer(offer);
    } catch (error) {
      console.error('Error creating help offer:', error);
      throw error;
    }
  }

  // Get help offer by ID
  static async getById(offerId: string): Promise<HelpOffer> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          mentor:users!help_offers_mentor_id_fkey(*),
          request:help_requests!help_offers_request_id_fkey(*)
        `)
        .eq('offer_id', offerId)
        .single();

      if (error) throw error;
      return new HelpOffer(data);
    } catch (error) {
      console.error('Error fetching help offer:', error);
      throw error;
    }
  }

  // Get offers by mentor
  static async getByMentor(mentorId: string): Promise<HelpOffer[]> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          request:help_requests!help_offers_request_id_fkey(
            *,
            mentee:users!help_requests_mentee_id_fkey(*)
          )
        `)
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((offer: any) => new HelpOffer(offer));
    } catch (error) {
      console.error('Error fetching mentor offers:', error);
      throw error;
    }
  }

  // Get offers by request
  static async getByRequest(requestId: string): Promise<HelpOffer[]> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          mentor:users!help_offers_mentor_id_fkey(*)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((offer: any) => new HelpOffer(offer));
    } catch (error) {
      console.error('Error fetching request offers:', error);
      throw error;
    }
  }

  // Get pending offers for a mentee (offers on their requests)
  static async getPendingForMentee(menteeId: string): Promise<HelpOffer[]> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          mentor:users!help_offers_mentor_id_fkey(*),
          request:help_requests!help_offers_request_id_fkey(*)
        `)
        .eq('status', 'Pending')
        .eq('request.mentee_id', menteeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((offer: any) => new HelpOffer(offer));
    } catch (error) {
      console.error('Error fetching pending offers for mentee:', error);
      throw error;
    }
  }

  // Update help offer
  async update(updateData: Partial<HelpOfferData>): Promise<HelpOffer> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .update(updateData)
        .eq('offer_id', this.offer_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('Error updating help offer:', error);
      throw error;
    }
  }

  // Accept offer
  async accept(): Promise<HelpOffer> {
    try {
      // Start a transaction-like operation
      // First, update this offer to accepted
      await this.update({ status: 'Accepted' });

      // Then, decline all other offers for the same request and cancel their bookings
      const { error: declineError } = await supabase
        .from('help_offers')
        .update({ status: 'Declined' })
        .eq('request_id', this.request_id)
        .neq('offer_id', this.offer_id);

      if (declineError) throw declineError;

      // Cancel bookings for declined offers
      const { error: cancelBookingsError } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('request_id', this.request_id)
        .neq('offer_id', this.offer_id);

      if (cancelBookingsError) throw cancelBookingsError;

      // Update the booking for this offer to Confirmed
      const { error: confirmBookingError } = await supabase
        .from('bookings')
        .update({ status: 'Confirmed' })
        .eq('offer_id', this.offer_id);

      if (confirmBookingError) throw confirmBookingError;

      // Finally, mark the request as assigned
      const { error: requestError } = await supabase
        .from('help_requests')
        .update({ status: 'Assigned' })
        .eq('request_id', this.request_id);

      if (requestError) throw requestError;

      return this;
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  }

  // Decline offer
  async decline(): Promise<HelpOffer> {
    try {
      return await this.update({ status: 'Declined' });
    } catch (error) {
      console.error('Error declining offer:', error);
      throw error;
    }
  }

  // Withdraw offer (mentor can withdraw their own offer)
  async withdraw(): Promise<HelpOffer> {
    try {
      // Update offer status to withdrawn
      await this.update({ status: 'Withdrawn' });

      // Cancel the associated booking
      const { error: cancelBookingError } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('offer_id', this.offer_id);

      if (cancelBookingError) throw cancelBookingError;

      return this;
    } catch (error) {
      console.error('Error withdrawing offer:', error);
      throw error;
    }
  }

  // Check if mentor has already offered on this request
  static async hasMentorOffered(mentorId: string, requestId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select('offer_id')
        .eq('mentor_id', mentorId)
        .eq('request_id', requestId)
        .in('status', ['Pending', 'Accepted']) // Only check for active offers
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking if mentor offered:', error);
      throw error;
    }
  }

  // Delete help offer
  async delete(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('help_offers')
        .delete()
        .eq('offer_id', this.offer_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting help offer:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON(): HelpOfferData {
    return {
      offer_id: this.offer_id,
      request_id: this.request_id,
      mentor_id: this.mentor_id,
      proposed_time: this.proposed_time,
      proposed_fee: this.proposed_fee,
      message: this.message,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
