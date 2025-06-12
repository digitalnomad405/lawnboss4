-- First, delete any existing data
TRUNCATE TABLE public.message_logs CASCADE;
TRUNCATE TABLE public.message_providers CASCADE;

-- Now insert the SendGrid settings
INSERT INTO public.message_providers (name, type, settings)
VALUES (
    'SendGrid',
    'email',
    '{
        "api_key": "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",
        "from_email": "estimates@lawnboss.sendgrid.net",
        "from_name": "LawnBoss"
    }'::jsonb
);

-- Insert Twilio settings
INSERT INTO public.message_providers (name, type, settings)
VALUES (
    'Twilio',
    'sms',
    '{
        "account_sid": "AC5c0b99ab90cbd904b7e3206374c1dce4",
        "auth_token": "e6ab0fe19505282e936791a2902a1839",
        "messaging_service_sid": "MGab4d2d37aa3974b2a5e93f7da0ee1c6a"
    }'::jsonb
); 