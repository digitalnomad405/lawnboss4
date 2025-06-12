// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

// Log environment variables availability
console.log('Environment variables check:', {
  SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
  SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
  SENDGRID_API_KEY: !!Deno.env.get('SENDGRID_API_KEY'),
  SENDGRID_FROM_EMAIL: !!Deno.env.get('SENDGRID_FROM_EMAIL'),
});

// SendGrid configuration
const SENDGRID_CONFIG = {
  api_key: Deno.env.get('SENDGRID_API_KEY'),
  from_email: Deno.env.get('SENDGRID_FROM_EMAIL') || 'estimates@lawnboss.sendgrid.net',
  from_name: Deno.env.get('SENDGRID_FROM_NAME') || 'LawnBoss'
};

console.log("Hello from Functions!")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { 
      headers: corsHeaders,
      status: 204
    });
  }

  // Validate SendGrid configuration
  if (!SENDGRID_CONFIG.api_key) {
    console.error('SendGrid API key not configured');
    return new Response(
      JSON.stringify({ error: 'SendGrid API key not configured' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }

  if (!SENDGRID_CONFIG.from_email) {
    console.error('SendGrid from email not configured');
    return new Response(
      JSON.stringify({ error: 'SendGrid from email not configured' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }

  try {
    // Log request details
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Parse request body
    const body = await req.json();
    console.log('Request body:', body);

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Request body must be a JSON object' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { invoiceId } = body;
    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'invoiceId is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Creating Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    console.log('SUPABASE_URL available:', !!supabaseUrl);
    console.log('SUPABASE_ANON_KEY available:', !!supabaseAnonKey);

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? ''
    );

    console.log('Fetching invoice data...');
    // Get invoice data with customer and items info
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        customer:customers (
          first_name,
          last_name,
          email,
          billing_address,
          billing_city,
          billing_state,
          billing_zip
        ),
        items:invoice_items (
          description,
          quantity,
          unit_price,
          tax_rate,
          tax_amount,
          subtotal,
          total
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: invoiceError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    if (!invoice) {
      console.error('Invoice not found for ID:', invoiceId);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    console.log('Invoice found:', {
      invoice_number: invoice.invoice_number,
      customer_email: invoice.customer.email,
      items_count: invoice.items.length
    });

    const emailContent = `
      Dear ${invoice.customer.first_name} ${invoice.customer.last_name},

      Your invoice #${invoice.invoice_number} has been generated.

      Invoice Details:
      Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
      Total Amount: $${invoice.total.toFixed(2)}

      Items:
      ${invoice.items.map(item => `- ${item.description}
         Quantity: ${item.quantity}
         Price: $${item.unit_price.toFixed(2)}
         Subtotal: $${item.subtotal.toFixed(2)}
         ${item.tax_rate > 0 ? `Tax (${(item.tax_rate * 100).toFixed(1)}%): $${item.tax_amount.toFixed(2)}` : ''}
         Total: $${item.total.toFixed(2)}`).join('\n')}

      Billing Address:
      ${invoice.customer.billing_address}
      ${invoice.customer.billing_city}, ${invoice.customer.billing_state} ${invoice.customer.billing_zip}

      To view your invoice and make a payment, please click the link below:
      ${Deno.env.get('PUBLIC_SITE_URL')}/invoices/${invoiceId}/view

      If you have any questions about this invoice, please don't hesitate to contact us.

      Thank you for your business!
      
      Best regards,
      LawnBoss Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${invoice.customer.first_name} ${invoice.customer.last_name},</p>

        <p>Your invoice #${invoice.invoice_number} has been generated.</p>

        <h3>Invoice Details:</h3>
        <p>
          Due Date: ${new Date(invoice.due_date).toLocaleDateString()}<br>
          Total Amount: $${invoice.total.toFixed(2)}
        </p>

        <h3>Items:</h3>
        <div style="margin-left: 20px;">
          ${invoice.items.map(item => `
            <div style="margin-bottom: 15px;">
              <strong>${item.description}</strong><br>
              Quantity: ${item.quantity}<br>
              Price: $${item.unit_price.toFixed(2)}<br>
              Subtotal: $${item.subtotal.toFixed(2)}<br>
              ${item.tax_rate > 0 ? `Tax (${(item.tax_rate * 100).toFixed(1)}%): $${item.tax_amount.toFixed(2)}<br>` : ''}
              Total: $${item.total.toFixed(2)}
            </div>
          `).join('')}
        </div>

        <h3>Billing Address:</h3>
        <p>
          ${invoice.customer.billing_address}<br>
          ${invoice.customer.billing_city}, ${invoice.customer.billing_state} ${invoice.customer.billing_zip}
        </p>

        <p>To view your invoice and make a payment, please click the link below:<br>
        <a href="${Deno.env.get('PUBLIC_SITE_URL')}/invoices/${invoiceId}/view">View Invoice</a></p>

        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

        <p>Thank you for your business!</p>
        
        <p>Best regards,<br>
        LawnBoss Team</p>
      </div>
    `;

    console.log('Preparing to send email via SendGrid...');

    const emailPayload = {
      personalizations: [{
        to: [{
          email: invoice.customer.email,
          name: `${invoice.customer.first_name} ${invoice.customer.last_name}`
        }]
      }],
      from: {
        email: SENDGRID_CONFIG.from_email,
        name: SENDGRID_CONFIG.from_name
      },
      subject: `Invoice #${invoice.invoice_number} from LawnBoss`,
      content: [
        {
          type: 'text/plain',
          value: emailContent
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    };

    console.log('Sending email with payload:', {
      to: emailPayload.personalizations[0].to[0].email,
      from: emailPayload.from.email,
      subject: emailPayload.subject
    });

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_CONFIG.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('SendGrid API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${errorText}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Email sent successfully, creating message record...');
    // Create message record
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        type: 'invoice',
        subject: `Invoice #${invoice.invoice_number}`,
        content: emailContent,
        sent_by: req.headers.get('x-user-id'),
        metadata: {
          invoice_id: invoiceId,
          customer_id: invoice.customer_id
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message record:', messageError);
      return new Response(
        JSON.stringify({ error: messageError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Creating message recipient record...');
    // Create message recipient
    const { error: recipientError } = await supabaseClient
      .from('message_recipients')
      .insert({
        message_id: message.id,
        customer_id: invoice.customer_id,
        recipient_name: `${invoice.customer.first_name} ${invoice.customer.last_name}`,
        recipient_email: invoice.customer.email,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (recipientError) {
      console.error('Error creating recipient record:', recipientError);
      return new Response(
        JSON.stringify({ error: recipientError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Updating invoice status...');
    // Update invoice status to sent
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice status:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('All operations completed successfully');
    return new Response(
      JSON.stringify({ message: 'Invoice sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Function error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}) 