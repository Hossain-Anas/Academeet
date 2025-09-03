-- First, drop the existing table and enum type
DROP TABLE IF EXISTS bookings CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;

-- Create the new enum type with all statuses
CREATE TYPE booking_status AS ENUM ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-show');

-- Recreate the bookings table with the new enum
CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentee_id UUID NOT NULL REFERENCES users(user_id),
    mentor_id UUID NOT NULL REFERENCES users(user_id),
    request_id UUID REFERENCES help_requests(request_id) ON DELETE SET NULL,
    offer_id UUID REFERENCES help_offers(offer_id) ON DELETE SET NULL,
    session_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    topic TEXT,
    message TEXT,
    status booking_status DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate the indexes for the bookings table
CREATE INDEX idx_bookings_mentee_id ON bookings(mentee_id);
CREATE INDEX idx_bookings_mentor_id ON bookings(mentor_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_mentor_status ON bookings(mentor_id, status);
CREATE INDEX idx_bookings_mentee_status ON bookings(mentee_id, status);

-- Recreate the updated_at trigger
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();