import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
}

// SendGrid configuration
const SENDGRID_CONFIG = {
  api_key: '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',
  from_email: 'estimates@lawnboss.sendgrid.net',
  from_name: 'LawnBoss'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invoiceId } = await req.json()

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'invoiceId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

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
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) throw new Error('Invoice not found')

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
    `

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
    `

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_CONFIG.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

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
      .single()

    if (messageError) throw messageError

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
      })

    if (recipientError) throw recipientError

    // Update invoice status
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ message: 'Invoice sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
}) 