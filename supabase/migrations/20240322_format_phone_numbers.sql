-- Create function to format phone numbers
CREATE OR REPLACE FUNCTION format_phone_number(phone text)
RETURNS text AS $$
DECLARE
    cleaned text;
BEGIN
    -- Remove all non-numeric characters
    cleaned := regexp_replace(phone, '\D', '', 'g');
    
    -- If it's a 10-digit number, add +1
    IF length(cleaned) = 10 THEN
        RETURN '+1' || cleaned;
    -- If it's 11 digits starting with 1, add +
    ELSIF length(cleaned) = 11 AND left(cleaned, 1) = '1' THEN
        RETURN '+' || cleaned;
    -- If it already has + and country code, return as is
    ELSIF phone LIKE '+1%' AND length(cleaned) = 11 THEN
        RETURN phone;
    ELSE
        RETURN phone;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing phone numbers
UPDATE customers
SET phone = format_phone_number(phone)
WHERE phone IS NOT NULL AND phone != ''; 