// @ts-ignore
import { supabase } from '../supabaseClient';
import { User } from '../models/user';
import { Notification } from '../models/notification';
import type { UserData } from '../types/database';

// Interface for signup data
interface SignUpData {
  email: string;
  password: string;
  name: string;
  department?: string;
  semester?: string;
  skills?: string[];
  interests?: string[];
}



// Interface for profile update data
interface ProfileUpdateData {
  name?: string;
  department?: string;
  semester?: string;
  skills?: string[];
  interests?: string[];
}

// Interface for auth response
interface AuthResponse {
  user: UserData;
  session: any;
}

// Interface for user role
interface UserRole {
  is_mentor: boolean;
  is_mentee: boolean;
}

export class AuthController {
  // Sign up a new user
  static async signUp(userData: SignUpData): Promise<AuthResponse> {
    try {
      const { email, password, name, department, semester, skills, interests } = userData;

      // Validate required fields
      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      // Validate university email (basic check)
      if (!email.includes('@') || (!email.includes('.edu') && !email.includes('university'))) {
        throw new Error('Please use a valid university email address');
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            department,
            semester,
            skills: skills || [],
            interests: interests || []
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create user profile in our users table
      const userProfile: UserData = {
        user_id: authData.user.id,
        name,
        email,
        department: department || '',
        semester: semester || '',
        skills: skills || [],
        interests: interests || [],
        is_mentor: false
      };

      const user = await User.create(userProfile);

      // Send welcome notification
      await Notification.create({
        user_id: authData.user.id,
        message: `Welcome to Academeet, ${name}! Complete your profile to get started.`,
        type: 'Request'
      });

      return {
        user: user.toJSON(),
        session: authData.session
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in an existing user
  static async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Invalid credentials');
      }

      // Get user profile
      const user = await User.getById(data.user.id);

      return {
        user: user.toJSON(),
        session: data.session
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out current user
  static async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user session
  static async getCurrentUser(): Promise<UserData | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      if (!user) return null;

      // Get user profile
      const userProfile = await User.getById(user.id);
      return userProfile.toJSON();
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  // Get current session
  static async getCurrentSession(): Promise<any> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get current session error:', error);
      throw error;
    }
  }

  // Reset password
  static async resetPassword(email: string): Promise<boolean> {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // Update password
  static async updatePassword(newPassword: string): Promise<boolean> {
    try {
      if (!newPassword) {
        throw new Error('New password is required');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(userId: string, profileData: ProfileUpdateData): Promise<UserData> {
    try {
      const user = await User.getById(userId);
      const updatedUser = await user.update(profileData);
      
      // Update auth metadata if needed
      const { error } = await supabase.auth.updateUser({
        data: {
          name: updatedUser.name,
          department: updatedUser.department,
          semester: updatedUser.semester,
          skills: updatedUser.skills,
          interests: updatedUser.interests
        }
      });

      if (error) throw error;
      return updatedUser.toJSON();
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Delete user account
  static async deleteAccount(userId: string): Promise<boolean> {
    try {
      // Delete user profile first
      const user = await User.getById(userId);
      await user.delete();

      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }

  // Verify email
  static async verifyEmail(token: string, type: 'email' = 'email'): Promise<any> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      return !!session;
    } catch (error) {
      console.error('Check authentication error:', error);
      return false;
    }
  }

  // Get user role (mentor/mentee)
  static async getUserRole(userId: string): Promise<UserRole> {
    try {
      const user = await User.getById(userId);
      return {
        is_mentor: user.is_mentor,
        is_mentee: !user.is_mentor || true // Everyone can be a mentee
      };
    } catch (error) {
      console.error('Get user role error:', error);
      throw error;
    }
  }

  // Toggle mentor status
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

  // Listen to auth state changes
  static onAuthStateChange(callback: (event: string, session: any) => void): any {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Refresh session
  static async refreshSession(): Promise<any> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Refresh session error:', error);
      throw error;
    }
  }
}
