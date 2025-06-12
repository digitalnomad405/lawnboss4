import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Hello from send-custom-email!')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { to, subject, message, customerName } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get SendGrid configuration
    const { data: provider, error: providerError } = await supabaseClient
      .from('message_providers')
      .select('*')
      .eq('type', 'email')
      .eq('is_active', true)
      .single()

    if (providerError || !provider) {
      throw new Error('Email provider not configured')
    }

    const SENDGRID_CONFIG = provider.settings

    // Create HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${customerName},</p>
        <div style="margin: 20px 0;">
          ${message.replace(/\n/g, '<br/>')}
        </div>
        <p style="color: #666; font-size: 14px;">
          Best regards,<br/>
          LawnBoss Team
        </p>
      </div>
    `

    // Send email using SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_CONFIG.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{
            email: to,
            name: customerName
          }]
        }],
        from: {
          email: SENDGRID_CONFIG.from_email,
          name: SENDGRID_CONFIG.from_name
        },
        subject: subject,
        content: [
          {
            type: 'text/plain',
            value: message
          },
          {
            type: 'text/html',
            value: htmlContent
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    // Log the message
    await supabaseClient
      .from('message_logs')
      .insert({
        provider_id: provider.id,
        message_type: 'custom_email',
        recipient: to,
        subject,
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