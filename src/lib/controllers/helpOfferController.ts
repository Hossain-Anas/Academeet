// @ts-ignore
import { supabase } from '../supabaseClient';
import { HelpOffer } from '../models/helpOffer';
import { HelpRequest } from '../models/helpRequest';
import { Notification } from '../models/notification';
import type { HelpOfferData } from '../types/database';

// Interface for creating help offer
interface CreateHelpOfferData {
  request_id: string;
  mentor_id: string;
  proposed_time?: string;
  proposed_fee?: number;
  message: string;
}

// Interface for updating help offer
interface UpdateHelpOfferData {
  proposed_time?: string;
  proposed_fee?: number;
  message?: string;
  status?: 'Pending' | 'Accepted' | 'Declined';
}

export class HelpOfferController {
  // Create a new help offer
  static async createHelpOffer(offerData: CreateHelpOfferData): Promise<HelpOfferData> {
    try {
      const { request_id, mentor_id, proposed_time, proposed_fee, message } = offerData;

      // Validate required fields
      if (!request_id || !mentor_id || !message) {
        throw new Error('Request ID, mentor ID, and message are required');
      }

      // Check if mentor has already offered on this request
      const hasOffered = await HelpOffer.hasMentorOffered(mentor_id, request_id);
      if (hasOffered) {
        throw new Error('You have already made an offer on this request');
      }

      // Create the help offer
      const helpOffer = await HelpOffer.create({
        request_id,
        mentor_id,
        proposed_time: proposed_time || null,
        proposed_fee: proposed_fee || null,
        message
      });

      // Send notification to mentee about new offer
      await this.notifyMenteeOfNewOffer(helpOffer.toJSON());

      return helpOffer.toJSON();
    } catch (error) {
      console.error('Create help offer error:', error);
      throw error;
    }
  }

  // Get help offer by ID
  static async getHelpOfferById(offerId: string): Promise<HelpOfferData> {
    try {
      const helpOffer = await HelpOffer.getById(offerId);
      return helpOffer.toJSON();
    } catch (error) {
      console.error('Get help offer error:', error);
      throw error;
    }
  }

  // Get all help offers by mentor
  static async getHelpOffersByMentor(mentorId: string): Promise<HelpOfferData[]> {
    try {
      const helpOffers = await HelpOffer.getByMentor(mentorId);
      return helpOffers.map(offer => offer.toJSON());
    } catch (error) {
      console.error('Get help offers by mentor error:', error);
      throw error;
    }
  }

  // Get help offers by request
  static async getHelpOffersByRequest(requestId: string): Promise<HelpOfferData[]> {
    try {
      const helpOffers = await HelpOffer.getByRequest(requestId);
      return helpOffers.map(offer => offer.toJSON());
    } catch (error) {
      console.error('Get help offers by request error:', error);
      throw error;
    }
  }

  // Get pending offers for a mentee
  static async getPendingOffersForMentee(menteeId: string): Promise<HelpOfferData[]> {
    try {
      const helpOffers = await HelpOffer.getPendingForMentee(menteeId);
      return helpOffers.map(offer => offer.toJSON());
    } catch (error) {
      console.error('Get pending offers for mentee error:', error);
      throw error;
    }
  }

  // Update help offer
  static async updateHelpOffer(offerId: string, updateData: UpdateHelpOfferData): Promise<HelpOfferData> {
    try {
      const helpOffer = await HelpOffer.getById(offerId);
      const updatedOffer = await helpOffer.update(updateData);

      // Send notification if status changed
      if (updateData.status && updateData.status !== helpOffer.status) {
        await this.handleOfferStatusChange(helpOffer, updateData.status);
      }

      return updatedOffer.toJSON();
    } catch (error) {
      console.error('Update help offer error:', error);
      throw error;
    }
  }

  // Accept help offer (by mentee)
  static async acceptHelpOffer(offerId: string, menteeId: string): Promise<HelpOfferData> {
    try {
      const helpOffer = await HelpOffer.getById(offerId);
      
      // Verify mentee owns the request
      const helpRequest = await HelpRequest.getById(helpOffer.request_id!);
      if (helpRequest.mentee_id !== menteeId) {
        throw new Error('You can only accept offers on your own requests');
      }

      // Check if offer is pending
      if (helpOffer.status !== 'Pending') {
        throw new Error('Can only accept pending offers');
      }

      // Accept the offer
      const updatedOffer = await helpOffer.accept();

      // Create a booking for this accepted offer
      await BookingController.createBookingFromOffer({
        offer_id: offerId,
        mentee_id: menteeId,
        session_time: helpOffer.proposed_time || new Date().toISOString(),
        duration_minutes: 60 // Default duration
      });

      // Send acceptance notifications
      await this.notifyOfferAccepted(helpOffer);

      return updatedOffer.toJSON();
    } catch (error) {
      console.error('Accept help offer error:', error);
      throw error;
    }
  }

  // Decline help offer (by mentee)
  static async declineHelpOffer(offerId: string, menteeId: string): Promise<HelpOfferData> {
    try {
      const helpOffer = await HelpOffer.getById(offerId);
      
      // Verify mentee owns the request
      const helpRequest = await HelpRequest.getById(helpOffer.request_id!);
      if (helpRequest.mentee_id !== menteeId) {
        throw new Error('You can only decline offers on your own requests');
      }

      // Check if offer is pending
      if (helpOffer.status !== 'Pending') {
        throw new Error('Can only decline pending offers');
      }

      // Decline the offer
      const updatedOffer = await helpOffer.decline();

      // Send decline notifications
      await this.notifyOfferDeclined(helpOffer);

      return updatedOffer.toJSON();
    } catch (error) {
      console.error('Decline help offer error:', error);
      throw error;
    }
  }

  // Withdraw help offer (by mentor)
  static async withdrawHelpOffer(offerId: string, mentorId: string): Promise<HelpOfferData> {
    try {
      const helpOffer = await HelpOffer.getById(offerId);
      
      // Verify mentor owns the offer
      if (helpOffer.mentor_id !== mentorId) {
        throw new Error('You can only withdraw your own offers');
      }

      // Check if offer is pending
      if (helpOffer.status !== 'Pending') {
        throw new Error('Can only withdraw pending offers');
      }

      // Withdraw the offer
      const updatedOffer = await helpOffer.withdraw();

      // Send withdrawal notifications
      await this.notifyOfferWithdrawn(helpOffer);

      return updatedOffer.toJSON();
    } catch (error) {
      console.error('Withdraw help offer error:', error);
      throw error;
    }
  }

  // Delete help offer
  static async deleteHelpOffer(offerId: string, userId: string): Promise<void> {
    try {
      const helpOffer = await HelpOffer.getById(offerId);
      
      // Check if user owns the offer
      if (helpOffer.mentor_id !== userId) {
        throw new Error('You can only delete your own offers');
      }

      await helpOffer.delete();
    } catch (error) {
      console.error('Delete help offer error:', error);
      throw error;
    }
  }

  // Check if mentor has offered on a request
  static async hasMentorOffered(mentorId: string, requestId: string): Promise<boolean> {
    try {
      return await HelpOffer.hasMentorOffered(mentorId, requestId);
    } catch (error) {
      console.error('Check if mentor offered error:', error);
      throw error;
    }
  }

  // Create notifications for a new offer
  private static async createOfferNotifications(menteeId: string, mentorId: string, mentorName: string, requestTitle: string): Promise<void> {
    try {
      const notifications = [
        {
          user_id: menteeId,
          message: `New offer from ${mentorName} for "${requestTitle}"`,
          type: 'Offer'
        },
        {
          user_id: mentorId,
          message: `You made an offer on "${requestTitle}". Awaiting response.`,
          type: 'Offer'
        }
      ];

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    } catch (error) {
      console.error('Create offer notifications error:', error);
      // Don't throw error as this is not critical
    }
  }

  // Handle offer status change
  private static async handleOfferStatusChange(helpOffer: any, newStatus: string): Promise<void> {
    try {
      if (newStatus === 'Accepted') {
        await this.notifyOfferAccepted(helpOffer);
      } else if (newStatus === 'Declined') {
        await this.notifyOfferDeclined(helpOffer);
      }
    } catch (error) {
      console.error('Handle offer status change error:', error);
    }
  }

  // Notify offer accepted
  private static async notifyOfferAccepted(helpOffer: any): Promise<void> {
    try {
      // Get the request
      const helpRequest = await HelpRequest.getById(helpOffer.request_id!);
      
      // Get mentor info
      const { data: mentor, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', helpOffer.mentor_id)
        .single();

      if (error) throw error;

      // Notify mentee
      await Notification.create({
        user_id: helpRequest.mentee_id,
        message: `Your offer from ${mentor.first_name} ${mentor.last_name} has been accepted!`,
        type: 'Offer'
      });

      // Notify mentor
      await Notification.create({
        user_id: helpOffer.mentor_id,
        message: `Your offer on "${helpRequest.title}" has been accepted!`,
        type: 'Offer'
      });
    } catch (error) {
      console.error('Notify offer accepted error:', error);
    }
  }

  // Notify offer declined
  private static async notifyOfferDeclined(helpOffer: any): Promise<void> {
    try {
      // Get the request
      const helpRequest = await HelpRequest.getById(helpOffer.request_id!);
      
      // Get mentor info
      const { data: mentor, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', helpOffer.mentor_id)
        .single();

      if (error) throw error;

      // Notify mentee
      await Notification.create({
        user_id: helpRequest.mentee_id,
        message: `You declined the offer from ${mentor.first_name} ${mentor.last_name}.`,
        type: 'Offer'
      });

      // Notify mentor
      await Notification.create({
        user_id: helpOffer.mentor_id,
        message: `Your offer on "${helpRequest.title}" was declined.`,
        type: 'Offer'
      });
    } catch (error) {
      console.error('Notify offer declined error:', error);
    }
  }

  // Notify offer withdrawn
  private static async notifyOfferWithdrawn(helpOffer: any): Promise<void> {
    try {
      // Get the request
      const helpRequest = await HelpRequest.getById(helpOffer.request_id!);
      
      // Get mentor info
      const { data: mentor, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', helpOffer.mentor_id)
        .single();

      if (error) throw error;

      // Notify mentee
      await Notification.create({
        user_id: helpRequest.mentee_id,
        message: `${mentor.first_name} ${mentor.last_name} withdrew their offer on "${helpRequest.title}".`,
        type: 'Offer'
      });

      // Notify mentor
      await Notification.create({
        user_id: helpOffer.mentor_id,
        message: `You withdrew your offer on "${helpRequest.title}".`,
        type: 'Offer'
      });
    } catch (error) {
      console.error('Notify offer withdrawn error:', error);
    }
  }
}
