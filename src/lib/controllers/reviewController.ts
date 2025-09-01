// @ts-ignore
import { supabase } from '../supabaseClient';
import { Review } from '../models/review';
import { Notification } from '../models/notification';
import type { ReviewData } from '../types/database';

// Interface for creating review
interface CreateReviewData {
  booking_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  feedback: string;
}

// Interface for updating review
interface UpdateReviewData {
  rating?: number;
  feedback?: string;
}

// Interface for review filters
interface ReviewFilters {
  rating?: number;
  limit?: number;
  offset?: number;
}

export class ReviewController {
  // Create a new review
  static async createReview(reviewData: CreateReviewData): Promise<ReviewData> {
    try {
      const { booking_id, reviewer_id, reviewed_user_id, rating, feedback } = reviewData;

      // Validate required fields
      if (!booking_id || !reviewer_id || !reviewed_user_id || !rating || !feedback) {
        throw new Error('All fields are required');
      }

      // Validate rating range
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if user can review this booking
      const canReview = await Review.canReview(booking_id, reviewer_id);
      if (!canReview) {
        throw new Error('You cannot review this booking');
      }

      // Create the review
      const review = await Review.create({
        booking_id,
        reviewer_id,
        reviewed_user_id,
        rating,
        feedback
      });

      // Update user's average rating
      await this.updateUserRating(reviewed_user_id);

      // Send notification to reviewed user
      await this.notifyReviewReceived(review.toJSON());

      return review.toJSON();
    } catch (error) {
      console.error('Create review error:', error);
      throw error;
    }
  }

  // Get review by ID
  static async getReviewById(reviewId: string): Promise<ReviewData> {
    try {
      const review = await Review.getById(reviewId);
      return review.toJSON();
    } catch (error) {
      console.error('Get review error:', error);
      throw error;
    }
  }

  // Get reviews by booking
  static async getReviewsByBooking(bookingId: string): Promise<ReviewData[]> {
    try {
      const reviews = await Review.getByBooking(bookingId);
      return reviews.map(review => review.toJSON());
    } catch (error) {
      console.error('Get reviews by booking error:', error);
      throw error;
    }
  }

  // Get reviews for a user (reviews they received)
  static async getReviewsForUser(userId: string): Promise<ReviewData[]> {
    try {
      const reviews = await Review.getForUser(userId);
      return reviews.map(review => review.toJSON());
    } catch (error) {
      console.error('Get reviews for user error:', error);
      throw error;
    }
  }

  // Get reviews by reviewer (reviews they wrote)
  static async getReviewsByReviewer(reviewerId: string): Promise<ReviewData[]> {
    try {
      const reviews = await Review.getByReviewer(reviewerId);
      return reviews.map(review => review.toJSON());
    } catch (error) {
      console.error('Get reviews by reviewer error:', error);
      throw error;
    }
  }

  // Update review
  static async updateReview(reviewId: string, userId: string, updateData: UpdateReviewData): Promise<ReviewData> {
    try {
      const review = await Review.getById(reviewId);
      
      // Check if user owns the review
      if (review.reviewer_id !== userId) {
        throw new Error('You can only update your own reviews');
      }

      // Validate rating range if updating
      if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Update the review
      const updatedReview = await review.update(updateData);

      // Update user's average rating if rating changed
      if (updateData.rating && review.reviewed_user_id) {
        await this.updateUserRating(review.reviewed_user_id);
      }

      return updatedReview.toJSON();
    } catch (error) {
      console.error('Update review error:', error);
      throw error;
    }
  }

  // Delete review
  static async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    try {
      const review = await Review.getById(reviewId);
      
      // Check if user owns the review
      if (review.reviewer_id !== userId) {
        throw new Error('You can only delete your own reviews');
      }

      // Delete the review
      const deleted = await review.delete();

      // Update user's average rating
      if (review.reviewed_user_id) {
        await this.updateUserRating(review.reviewed_user_id);
      }

      return deleted;
    } catch (error) {
      console.error('Delete review error:', error);
      throw error;
    }
  }

  // Get average rating for a user
  static async getUserAverageRating(userId: string): Promise<{ average: number; count: number }> {
    try {
      return await Review.getAverageRating(userId);
    } catch (error) {
      console.error('Get user average rating error:', error);
      throw error;
    }
  }

  // Get rating distribution for a user
  static async getUserRatingDistribution(userId: string): Promise<{ [key: number]: number }> {
    try {
      return await Review.getRatingDistribution(userId);
    } catch (error) {
      console.error('Get user rating distribution error:', error);
      throw error;
    }
  }

  // Check if user can review a booking
  static async canUserReview(bookingId: string, userId: string): Promise<boolean> {
    try {
      return await Review.canReview(bookingId, userId);
    } catch (error) {
      console.error('Check if user can review error:', error);
      throw error;
    }
  }

  // Get reviews with filters
  static async getReviewsWithFilters(filters: ReviewFilters = {}): Promise<ReviewData[]> {
    try {
      // Get all reviews and apply filters in memory since model doesn't support complex filtering
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(*),
          reviewed_user:users!reviews_reviewed_user_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredReviews = reviews;

      // Apply rating filter
      if (filters.rating) {
        filteredReviews = filteredReviews.filter((review: any) => review.rating === filters.rating);
      }

      // Apply limit and offset
      if (filters.offset) {
        filteredReviews = filteredReviews.slice(filters.offset);
      }
      if (filters.limit) {
        filteredReviews = filteredReviews.slice(0, filters.limit);
      }

      return filteredReviews.map((review: any) => new Review(review).toJSON());
    } catch (error) {
      console.error('Get reviews with filters error:', error);
      throw error;
    }
  }

  // Get top rated users
  static async getTopRatedUsers(limit: number = 10): Promise<Array<{ user_id: string; average_rating: number; review_count: number }>> {
    try {
      // Get all users with their average ratings
      const { data: users, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name');

      if (error) throw error;

      const userRatings = await Promise.all(
        users.map(async (user: any) => {
          const rating = await Review.getAverageRating(user.user_id);
          return {
            user_id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
            average_rating: rating.average,
            review_count: rating.count
          };
        })
      );

      // Sort by average rating and review count
      const sortedUsers = userRatings
        .filter((user: any) => user.review_count > 0)
        .sort((a: any, b: any) => {
          if (b.average_rating !== a.average_rating) {
            return b.average_rating - a.average_rating;
          }
          return b.review_count - a.review_count;
        })
        .slice(0, limit);

      return sortedUsers;
    } catch (error) {
      console.error('Get top rated users error:', error);
      throw error;
    }
  }

  // Get recent reviews
  static async getRecentReviews(limit: number = 10): Promise<ReviewData[]> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(*),
          reviewed_user:users!reviews_reviewed_user_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return reviews.map((review: any) => new Review(review).toJSON());
    } catch (error) {
      console.error('Get recent reviews error:', error);
      throw error;
    }
  }

  // Get review statistics
  static async getReviewStats(): Promise<{
    total: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
    recentReviews: number;
  }> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*');

      if (error) throw error;

      const total = reviews.length;
      const averageRating = reviews.reduce((acc: number, review: any) => acc + review.rating, 0) / total || 0;
      
      const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((review: any) => {
        ratingDistribution[review.rating]++;
      });

      // Count recent reviews (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentReviews = reviews.filter((review: any) => 
        new Date(review.created_at) > thirtyDaysAgo
      ).length;

      return {
        total,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingDistribution,
        recentReviews
      };
    } catch (error) {
      console.error('Get review stats error:', error);
      throw error;
    }
  }

  // Update user's average rating in user table
  private static async updateUserRating(userId: string): Promise<void> {
    try {
      const rating = await Review.getAverageRating(userId);
      
      // Update user's average rating in the users table
      const { error } = await supabase
        .from('users')
        .update({ 
          average_rating: rating.average,
          total_reviews: rating.count
        })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Update user rating error:', error);
      // Don't throw error as this is not critical
    }
  }

  // Notify user about new review
  private static async notifyReviewReceived(review: ReviewData): Promise<void> {
    try {
      // Get reviewer info
      const { data: reviewer, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', review.reviewer_id)
        .single();

      if (error) throw error;

      // Create notification for reviewed user
      await Notification.create({
        user_id: review.reviewed_user_id!,
        message: `You received a ${review.rating}-star review from ${reviewer.first_name} ${reviewer.last_name}: "${review.feedback?.substring(0, 100) || ''}..."`,
        type: 'Review'
      });
    } catch (error) {
      console.error('Notify review received error:', error);
      // Don't throw error as this is not critical
    }
  }
}
