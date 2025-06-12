-- Create message_status type
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- Create messages table
CREATE TABLE messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN ('email', 'sms')),
    subject text,
    content text NOT NULL,
    sent_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status message_status DEFAULT 'pending',
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT messages_pkey PRIMARY KEY (id)
);

-- Create message_recipients table
CREATE TABLE message_recipients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customers(id),
    recipient_name text NOT NULL,
    recipient_email text,
    recipient_phone text,
    status message_status DEFAULT 'pending',
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT message_recipients_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_message_recipients_message_id ON message_recipients(message_id);
CREATE INDEX idx_message_recipients_customer_id ON message_recipients(customer_id);
CREATE INDEX idx_message_recipients_status ON message_recipients(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users"
    ON messages FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON messages FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow read access for authenticated users"
    ON message_recipients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON message_recipients FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON message_recipients FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true); 