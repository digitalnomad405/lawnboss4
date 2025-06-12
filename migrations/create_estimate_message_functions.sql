-- Function to create an email message for an estimate
CREATE OR REPLACE FUNCTION create_estimate_email_message(
  p_estimate_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
  v_estimate RECORD;
  v_content TEXT;
BEGIN
  -- Get estimate details
  SELECT 
    e.*,
    c.first_name,
    c.last_name,
    c.email,
    p.address_line1,
    p.address_line2,
    p.city,
    p.state,
    p.zip_code
  INTO v_estimate
  FROM estimates e
  JOIN customers c ON c.id = e.customer_id
  JOIN properties p ON p.id = e.property_id
  WHERE e.id = p_estimate_id;

  -- Create email content
  v_content := format(
    'Dear %s %s,

    Please find attached your estimate for:
    %s

    Property:
    %s
    %s
    %s, %s %s

    Total Amount: $%s
    Valid Until: %s

    Thank you for your business!',
    v_estimate.first_name,
    v_estimate.last_name,
    v_estimate.title,
    v_estimate.address_line1,
    COALESCE(v_estimate.address_line2 || E'\n', ''),
    v_estimate.city,
    v_estimate.state,
    v_estimate.zip_code,
    v_estimate.total_amount::numeric(10,2),
    v_estimate.valid_until
  );

  -- Create message record
  INSERT INTO messages (
    type,
    subject,
    content,
    sent_by,
    metadata
  )
  VALUES (
    'estimate',
    'Estimate: ' || v_estimate.title,
    v_content,
    p_user_id,
    jsonb_build_object(
      'estimate_id', p_estimate_id,
      'customer_id', v_estimate.customer_id,
      'property_id', v_estimate.property_id
    )
  )
  RETURNING id INTO v_message_id;

  -- Create message recipient
  INSERT INTO message_recipients (
    message_id,
    customer_id,
    recipient_name,
    recipient_email,
    status,
    sent_at
  )
  VALUES (
    v_message_id,
    v_estimate.customer_id,
    v_estimate.first_name || ' ' || v_estimate.last_name,
    v_estimate.email,
    'pending',
    NOW()
  );

  -- Update estimate status
  UPDATE estimates
  SET status = 'sent'
  WHERE id = p_estimate_id;

  RETURN v_message_id;
END;
$$;

-- Function to create an SMS message for an estimate
CREATE OR REPLACE FUNCTION create_estimate_sms_message(
  p_estimate_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
  v_estimate RECORD;
  v_content TEXT;
BEGIN
  -- Get estimate details
  SELECT 
    e.*,
    c.first_name,
    c.last_name,
    c.phone
  INTO v_estimate
  FROM estimates e
  JOIN customers c ON c.id = e.customer_id
  WHERE e.id = p_estimate_id;

  -- Create SMS content
  v_content := format(
    'Hi %s, your estimate for %s is ready. Total: $%s. View and respond here: /estimates/%s/view',
    v_estimate.first_name,
    v_estimate.title,
    v_estimate.total_amount::numeric(10,2),
    p_estimate_id
  );

  -- Create message record
  INSERT INTO messages (
    type,
    content,
    sent_by,
    metadata
  )
  VALUES (
    'estimate_sms',
    v_content,
    p_user_id,
    jsonb_build_object(
      'estimate_id', p_estimate_id,
      'customer_id', v_estimate.customer_id
    )
  )
  RETURNING id INTO v_message_id;

  -- Create message recipient
  INSERT INTO message_recipients (
    message_id,
    customer_id,
    recipient_name,
    recipient_phone,
    status,
    sent_at
  )
  VALUES (
    v_message_id,
    v_estimate.customer_id,
    v_estimate.first_name || ' ' || v_estimate.last_name,
    v_estimate.phone,
    'pending',
    NOW()
  );

  -- Update estimate status
  UPDATE estimates
  SET status = 'sent'
  WHERE id = p_estimate_id;

  RETURN v_message_id;
END;
$$;

-- Function to mark a message as delivered
CREATE OR REPLACE FUNCTION mark_message_delivered(
  p_message_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE message_recipients
  SET 
    status = 'delivered',
    delivered_at = NOW()
  WHERE message_id = p_message_id;
END;
$$;

-- Function to mark a message as failed
CREATE OR REPLACE FUNCTION mark_message_failed(
  p_message_id UUID,
  p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE message_recipients
  SET 
    status = 'failed',
    error_message = p_error_message
  WHERE message_id = p_message_id;
END;
$$; 