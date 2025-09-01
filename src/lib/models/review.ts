// @ts-ignore
import { supabase } from '../supabaseClient';
import type { ReviewData } from '../types/database';

export class Review {
  review_id: string | null;
  booking_id: string | null;
  reviewer_id: string | null;
  reviewed_user_id: string | null;
  rating: number | null;
  feedback: string;
  created_at: string | null;

  constructor(data: ReviewData = {}) {
    this.review_id = data.review_id || null;
    this.booking_id = data.booking_id || null;
    this.reviewer_id = data.reviewer_id || null;
    this.reviewed_user_id = data.reviewed_user_id || null;
    this.rating = data.rating || null;
    this.feedback = data.feedback || '';
    this.created_at = data.created_at || null;
  }

  // Create a new review
  static async create(reviewData: ReviewData): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([reviewData])
        .select()
        .single();

      if (error) throw error;
      return new Review(data);
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // Get review by ID
  static async getById(reviewId: string): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(*),
          reviewed_user:users!reviews_reviewed_user_id_fkey(*),
          booking:bookings!reviews_booking_id_fkey(*)
        `)
        .eq('review_id', reviewId)
        .single();

      if (error) throw error;
      return new Review(data);
    } catch (error) {
      console.error('Error fetching review:', error);
      throw error;
    }
  }

  // Get reviews by booking
  static async getByBooking(bookingId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(*),
          reviewed_user:users!reviews_reviewed_user_id_fkey(*)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((review: any) => new Review(review));
    } catch (error) {
      console.error('Error fetching reviews by booking:', error);
      throw error;
    }
  }

  // Get reviews for a user (reviews they received)
  static async getForUser(userId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(*),
          booking:bookings!reviews_booking_id_fkey(*)
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((review: any) => new Review(review));
    } catch (error) {
      console.error('Error fetching reviews for user:', error);
      throw error;
    }
  }

  // Get reviews by reviewer (reviews they wrote)
  static async getByReviewer(reviewerId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewed_user:users!reviews_reviewed_user_id_fkey(*),
          booking:bookings!reviews_booking_id_fkey(*)
        `)
        .eq('reviewer_id', reviewerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((review: any) => new Review(review));
    } catch (error) {
      console.error('Error fetching reviews by reviewer:', error);
      throw error;
    }
  }

  // Get average rating for a user
  static async getAverageRating(userId: string): Promise<{ average: number; count: number }> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_user_id', userId);

      if (error) throw error;
      
      if (data.length === 0) return { average: 0, count: 0 };
      
      const sum = data.reduce((acc: number, review: any) => acc + review.rating, 0);
      const average = (sum / data.length).toFixed(1);
      
      return { average: parseFloat(average), count: data.length };
    } catch (error) {
      console.error('Error fetching average rating:', error);
      throw error;
    }
  }

  // Get rating distribution for a user
  static async getRatingDistribution(userId: string): Promise<{ [key: number]: number }> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_user_id', userId);

      if (error) throw error;
      
      const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      data.forEach((review: any) => {
        distribution[review.rating]++;
      });
      
      return distribution;
    } catch (error) {
      console.error('Error fetching rating distribution:', error);
      throw error;
    }
  }

  // Check if user can review a booking
  static async canReview(bookingId: string, userId: string): Promise<boolean> {
    try {
      // Check if booking exists and is completed
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'Completed')
        .single();

      if (bookingError || !booking) return false;

      // Check if user is involved in the booking
      if (booking.mentee_id !== userId && booking.mentor_id !== userId) {
        return false;
      }

      // Check if user has already reviewed this booking
      const { data: existingReview, error: reviewError } = await supabase
        .from('reviews')
        .select('review_id')
        .eq('booking_id', bookingId)
        .eq('reviewer_id', userId)
        .single();

      if (reviewError && reviewError.code !== 'PGRST116') throw reviewError;
      
      return !existingReview;
    } catch (error) {
      console.error('Error checking if user can review:', error);
      throw error;
    }
  }

  // Update review
  async update(updateData: Partial<ReviewData>): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('review_id', this.review_id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  // Delete review
  async delete(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('review_id', this.review_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  // Get star rating as string
  getStarRating(): string {
    if (!this.rating) return '☆☆☆☆☆';
    return '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
  }

  // Check if review is recent (within last 30 days)
  isRecent(): boolean {
    if (!this.created_at) return false;
    const reviewDate = new Date(this.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  }

  // Convert to JSON
  toJSON(): ReviewData {
    return {
      review_id: this.review_id,
      booking_id: this.booking_id,
      reviewer_id: this.reviewer_id,
      reviewed_user_id: this.reviewed_user_id,
      rating: this.rating,
      feedback: this.feedback,
      created_at: this.created_at
    };
  }
}
