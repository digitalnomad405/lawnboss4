import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Hello from send-custom-sms!')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { to, message } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get Twilio configuration
    const { data: provider, error: providerError } = await supabaseClient
      .from('message_providers')
      .select('*')
      .eq('type', 'sms')
      .eq('is_active', true)
      .single()

    if (providerError || !provider) {
      throw new Error('SMS provider not configured')
    }

    const TWILIO_CONFIG = provider.settings

    // Send SMS using Twilio
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.account_sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_CONFIG.account_sid}:${TWILIO_CONFIG.auth_token}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_CONFIG.messaging_service_sid,
          Body: message
        })
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Failed to send SMS: ${result.message}`)
    }

    // Log the message
    await supabaseClient
      .from('message_logs')
      .insert({
        provider_id: provider.id,
        message_type: 'custom_sms',
        recipient: to,
        content: message,
        status: 'sent'
      })

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 