// Database type definitions

export interface UserData {
  user_id?: string | null;
  name?: string;
  email?: string;
  department?: string;
  semester?: string;
  skills?: string[];
  interests?: string[];
  learning_interests?: string[];
  teaching_style?: string;
  session_types?: string[];
  is_mentor?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HelpRequestData {
  request_id?: string | null;
  mentee_id?: string | null;
  title?: string;
  course_code?: string;
  description?: string;
  preferred_time?: string | null;
  budget?: number | null;
  status?: 'Open' | 'Assigned' | 'Closed';
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HelpOfferData {
  offer_id?: string | null;
  request_id?: string | null;
  mentor_id?: string | null;
  proposed_time?: string | null;
  proposed_fee?: number | null;
  message?: string;
  status?: 'Pending' | 'Accepted' | 'Declined' | 'Withdrawn';
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BookingData {
  booking_id?: string | null;
  mentee_id?: string | null;
  mentor_id?: string | null;
  request_id?: string | null;
  offer_id?: string | null;
  session_time?: string | null;
  duration_minutes?: number;
  status?: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-show';
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReviewData {
  review_id?: string | null;
  booking_id?: string | null;
  reviewer_id?: string | null;
  reviewed_user_id?: string | null;
  rating?: number | null;
  feedback?: string;
  created_at?: string | null;
}

export interface NotificationData {
  notification_id?: string | null;
  user_id?: string | null;
  message?: string;
  type?: 'Request' | 'Offer' | 'Booking' | 'Reminder' | 'Review';
  is_read?: boolean;
  created_at?: string | null;
}

export interface MentorAvailabilityData {
  availability_id?: string | null;
  mentor_id?: string | null;
  day_of_week?: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string | null;
}

// Filter interfaces
export interface MentorFilters {
  department?: string;
  skills?: string[];
}

export interface RequestFilters {
  status?: string;
  course_code?: string;
  department?: string;
  max_budget?: number;
}

// Auth interfaces
export interface SignUpData {
  email: string;
  password: string;
  name: string;
  department?: string;
  semester?: string;
  skills?: string[];
  interests?: string[];
}

export interface AuthResult {
  user: UserData;
  session: any;
}
