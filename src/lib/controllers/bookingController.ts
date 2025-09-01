// @ts-ignore
import { supabase } from '../supabaseClient';
import { Booking } from '../models/booking';
import { HelpOffer } from '../models/helpOffer';
import { HelpRequest } from '../models/helpRequest';
import { Notification } from '../models/notification';
import type { BookingData } from '../types/database';

// Interface for creating booking from offer
interface CreateBookingFromOfferData {
  offer_id: string;
  mentee_id: string;
  session_time: string;
  duration_minutes?: number;
}

// Interface for creating direct booking
interface CreateDirectBookingData {
  mentee_id: string;
  mentor_id: string;
  session_time: string;
  duration_minutes?: number;
  request_id?: string;
}

// Interface for updating booking
interface UpdateBookingData {
  session_time?: string;
  duration_minutes?: number;
  status?: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-show';
}

export class BookingController {
  // Create booking from accepted offer
  static async createBookingFromOffer(bookingData: CreateBookingFromOfferData): Promise<BookingData> {
    try {
      const { offer_id, mentee_id, session_time, duration_minutes } = bookingData;

      // Validate required fields
      if (!offer_id || !mentee_id || !session_time) {
        throw new Error('Offer ID, mentee ID, and session time are required');
      }

      // Get the offer and verify it's accepted
      const helpOffer = await HelpOffer.getById(offer_id);
      if (helpOffer.status !== 'Accepted') {
        throw new Error('Can only create booking from accepted offers');
      }

      // Verify mentee owns the request
      const helpRequest = await HelpRequest.getById(helpOffer.request_id!);
      if (helpRequest.mentee_id !== mentee_id) {
        throw new Error('You can only create bookings for your own requests');
      }

      // Create the booking
      const booking = await Booking.create({
        mentee_id,
        mentor_id: helpOffer.mentor_id,
        request_id: helpOffer.request_id,
        offer_id,
        session_time,
        duration_minutes: duration_minutes || 60
      });

      // Send notifications
      await this.notifyBookingCreated(booking.toJSON(), helpRequest);

      return booking.toJSON();
    } catch (error) {
      console.error('Create booking from offer error:', error);
      throw error;
    }
  }

  // Create direct booking (without help request)
  static async createDirectBooking(bookingData: CreateDirectBookingData): Promise<BookingData> {
    try {
      const { mentee_id, mentor_id, session_time, duration_minutes, request_id } = bookingData;

      // Validate required fields
      if (!mentee_id || !mentor_id || !session_time) {
        throw new Error('Mentee ID, mentor ID, and session time are required');
      }

      // Create the booking
      const booking = await Booking.create({
        mentee_id,
        mentor_id,
        request_id: request_id || null,
        offer_id: null,
        session_time,
        duration_minutes: duration_minutes || 60
      });

      // Send notifications
      await this.notifyDirectBookingCreated(booking.toJSON());

      return booking.toJSON();
    } catch (error) {
      console.error('Create direct booking error:', error);
      throw error;
    }
  }

  // Get booking by ID
  static async getBookingById(bookingId: string): Promise<BookingData> {
    try {
      const booking = await Booking.getById(bookingId);
      return booking.toJSON();
    } catch (error) {
      console.error('Get booking error:', error);
      throw error;
    }
  }

  // Get all bookings for a user (both as mentee and mentor)
  static async getBookingsByUser(userId: string): Promise<BookingData[]> {
    try {
      const bookings = await Booking.getByUser(userId);
      return bookings.map(booking => booking.toJSON());
    } catch (error) {
      console.error('Get bookings error:', error);
      throw error;
    }
  }

  // Get bookings by mentee
  static async getBookingsByMentee(menteeId: string): Promise<BookingData[]> {
    try {
      const bookings = await Booking.getByMentee(menteeId);
      return bookings.map(booking => booking.toJSON());
    } catch (error) {
      console.error('Get bookings by mentee error:', error);
      throw error;
    }
  }

  // Get bookings by mentor
  static async getBookingsByMentor(mentorId: string): Promise<BookingData[]> {
    try {
      const bookings = await Booking.getByMentor(mentorId);
      return bookings.map(booking => booking.toJSON());
    } catch (error) {
      console.error('Get bookings by mentor error:', error);
      throw error;
    }
  }

  // Update booking
  static async updateBooking(bookingId: string, updateData: UpdateBookingData): Promise<BookingData> {
    try {
      const booking = await Booking.getById(bookingId);
      const updatedBooking = await booking.update(updateData);

      // Send notification if status changed
      if (updateData.status && updateData.status !== booking.status) {
        await this.handleBookingStatusChange(booking, updateData.status);
      }

      return updatedBooking.toJSON();
    } catch (error) {
      console.error('Update booking error:', error);
      throw error;
    }
  }

  // Cancel booking
  static async cancelBooking(bookingId: string, userId: string): Promise<BookingData> {
    try {
      const booking = await Booking.getById(bookingId);
      
      // Check if user is involved in the booking
      if (booking.mentee_id !== userId && booking.mentor_id !== userId) {
        throw new Error('You can only cancel bookings you are involved in');
      }

      // Check if booking can be cancelled
      if (booking.status !== 'Scheduled') {
        throw new Error('Can only cancel scheduled bookings');
      }

      // Cancel the booking
      const updatedBooking = await booking.cancel();

      // Send cancellation notifications
      await this.notifyBookingCancelled(booking);

      return updatedBooking.toJSON();
    } catch (error) {
      console.error('Cancel booking error:', error);
      throw error;
    }
  }

  // Complete booking
  static async completeBooking(bookingId: string, userId: string): Promise<BookingData> {
    try {
      const booking = await Booking.getById(bookingId);
      
      // Check if user is involved in the booking
      if (booking.mentee_id !== userId && booking.mentor_id !== userId) {
        throw new Error('You can only complete bookings you are involved in');
      }

      // Check if booking is scheduled
      if (booking.status !== 'Scheduled') {
        throw new Error('Can only complete scheduled bookings');
      }

      // Complete the booking
      const updatedBooking = await booking.complete();

      // Send completion notifications
      await this.notifyBookingCompleted(booking);

      return updatedBooking.toJSON();
    } catch (error) {
      console.error('Complete booking error:', error);
      throw error;
    }
  }

  // Mark booking as no-show
  static async markBookingAsNoShow(bookingId: string, userId: string): Promise<BookingData> {
    try {
      const booking = await Booking.getById(bookingId);
      
      // Check if user is involved in the booking
      if (booking.mentee_id !== userId && booking.mentor_id !== userId) {
        throw new Error('You can only mark bookings you are involved in as no-show');
      }

      // Check if booking is scheduled
      if (booking.status !== 'Scheduled') {
        throw new Error('Can only mark scheduled bookings as no-show');
      }

      // Mark as no-show
      const updatedBooking = await booking.markNoShow();

      // Send no-show notifications
      await this.notifyBookingNoShow(booking);

      return updatedBooking.toJSON();
    } catch (error) {
      console.error('Mark booking as no-show error:', error);
      throw error;
    }
  }

  // Get bookings by status
  static async getBookingsByStatus(status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-show'): Promise<BookingData[]> {
    try {
      const bookings = await Booking.getByStatus(status);
      return bookings.map(booking => booking.toJSON());
    } catch (error) {
      console.error('Get bookings by status error:', error);
      throw error;
    }
  }

  // Get upcoming bookings
  static async getUpcomingBookings(userId: string): Promise<BookingData[]> {
    try {
      const bookings = await Booking.getUpcoming(userId);
      return bookings.map(booking => booking.toJSON());
    } catch (error) {
      console.error('Get upcoming bookings error:', error);
      throw error;
    }
  }

  // Get completed bookings
  static async getCompletedBookings(userId: string): Promise<BookingData[]> {
    try {
      const bookings = await Booking.getCompleted(userId);
      return bookings.map(booking => booking.toJSON());
    } catch (error) {
      console.error('Get completed bookings error:', error);
      throw error;
    }
  }

  // Reschedule booking
  static async rescheduleBooking(bookingId: string, userId: string, newSessionTime: string): Promise<BookingData> {
    try {
      const booking = await Booking.getById(bookingId);
      
      // Check if user is involved in the booking
      if (booking.mentee_id !== userId && booking.mentor_id !== userId) {
        throw new Error('You can only reschedule bookings you are involved in');
      }

      // Check if booking is scheduled
      if (booking.status !== 'Scheduled') {
        throw new Error('Can only reschedule scheduled bookings');
      }

      // Reschedule the booking
      const updatedBooking = await booking.reschedule(newSessionTime);

      // Send reschedule notifications
      await this.notifyBookingRescheduled(booking, newSessionTime);

      return updatedBooking.toJSON();
    } catch (error) {
      console.error('Reschedule booking error:', error);
      throw error;
    }
  }

  // Check if booking can be cancelled
  static async canCancelBooking(bookingId: string): Promise<boolean> {
    try {
      const booking = await Booking.getById(bookingId);
      return booking.canBeCancelled();
    } catch (error) {
      console.error('Check if booking can be cancelled error:', error);
      throw error;
    }
  }

  // Check if booking is upcoming
  static async isBookingUpcoming(bookingId: string): Promise<boolean> {
    try {
      const booking = await Booking.getById(bookingId);
      return booking.isUpcoming();
    } catch (error) {
      console.error('Check if booking is upcoming error:', error);
      throw error;
    }
  }

  // Notify booking created
  private static async notifyBookingCreated(booking: BookingData, helpRequest: any): Promise<void> {
    try {
      // Notify mentee
      await Notification.create({
        user_id: booking.mentee_id,
        message: `Your session for "${helpRequest.title}" has been scheduled for ${booking.session_time}.`,
        type: 'Booking'
      });

      // Notify mentor
      await Notification.create({
        user_id: booking.mentor_id,
        message: `A new session has been scheduled for ${booking.session_time}.`,
        type: 'Booking'
      });
    } catch (error) {
      console.error('Notify booking created error:', error);
    }
  }

  // Notify direct booking created
  private static async notifyDirectBookingCreated(booking: BookingData): Promise<void> {
    try {
      // Notify mentee
      await Notification.create({
        user_id: booking.mentee_id,
        message: `Your session has been scheduled for ${booking.session_time}.`,
        type: 'Booking'
      });

      // Notify mentor
      await Notification.create({
        user_id: booking.mentor_id,
        message: `A new session has been scheduled for ${booking.session_time}.`,
        type: 'Booking'
      });
    } catch (error) {
      console.error('Notify direct booking created error:', error);
    }
  }

  // Handle booking status change
  private static async handleBookingStatusChange(booking: any, newStatus: string): Promise<void> {
    try {
      if (newStatus === 'Completed') {
        await this.notifyBookingCompleted(booking);
      } else if (newStatus === 'Cancelled') {
        await this.notifyBookingCancelled(booking);
      } else if (newStatus === 'No-show') {
        await this.notifyBookingNoShow(booking);
      }
    } catch (error) {
      console.error('Handle booking status change error:', error);
    }
  }

  // Notify booking completed
  private static async notifyBookingCompleted(booking: any): Promise<void> {
    try {
      // Notify mentee
      await Notification.create({
        user_id: booking.mentee_id,
        message: 'Your session has been marked as completed. Please leave a review!',
        type: 'Booking'
      });

      // Notify mentor
      await Notification.create({
        user_id: booking.mentor_id,
        message: 'Your session has been marked as completed.',
        type: 'Booking'
      });
    } catch (error) {
      console.error('Notify booking completed error:', error);
    }
  }

  // Notify booking cancelled
  private static async notifyBookingCancelled(booking: any): Promise<void> {
    try {
      // Notify mentee
      await Notification.create({
        user_id: booking.mentee_id,
        message: 'Your session has been cancelled.',
        type: 'Booking'
      });

      // Notify mentor
      await Notification.create({
        user_id: booking.mentor_id,
        message: 'A session has been cancelled.',
        type: 'Booking'
      });
    } catch (error) {
      console.error('Notify booking cancelled error:', error);
    }
  }

  // Notify booking no-show
  private static async notifyBookingNoShow(booking: any): Promise<void> {
    try {
      // Notify mentee
      await Notification.create({
        user_id: booking.mentee_id,
        message: 'Your session has been marked as no-show.',
        type: 'Booking'
      });

      // Notify mentor
      await Notification.create({
        user_id: booking.mentor_id,
        message: 'A session has been marked as no-show.',
        type: 'Booking'
      });
    } catch (error) {
      console.error('Notify booking no-show error:', error);
    }
  }

  // Notify booking rescheduled
  private static async notifyBookingRescheduled(booking: any, newSessionTime: string): Promise<void> {
    try {
      // Notify mentee
      await Notification.create({
        user_id: booking.mentee_id,
        message: `Your session has been rescheduled to ${newSessionTime}.`,
        type: 'Booking'
      });

      // Notify mentor
      await Notification.create({
        user_id: booking.mentor_id,
        message: `A session has been rescheduled to ${newSessionTime}.`,
        type: 'Booking'
      });
    } catch (error) {
      console.error('Notify booking rescheduled error:', error);
    }
  }
}
