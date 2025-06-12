import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'

console.log('Hello from Generate PDF!')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { type, id, template } = await req.json()

    if (!type || !id || !['invoice', 'estimate'].includes(type)) {
      throw new Error('Invalid request parameters')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get data based on type
    let data
    if (type === 'invoice') {
      const { data: invoice, error } = await supabaseClient
        .from('invoices')
        .select(`
          *,
          customer:customers (
            first_name,
            last_name,
            email,
            phone,
            billing_address,
            billing_city,
            billing_state,
            billing_zip
          ),
          items:invoice_items (
            *,
            service_schedule:service_schedules (
              description
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      data = invoice
    } else {
      const { data: estimate, error } = await supabaseClient
        .from('estimates')
        .select(`
          *,
          customer:customers (
            first_name,
            last_name,
            email,
            phone,
            billing_address,
            billing_city,
            billing_state,
            billing_zip
          ),
          items:estimate_items (
            *,
            service_type:service_types (
              name,
              description
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      data = estimate
    }

    // Launch browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox']
    })

    // Create a new page
    const page = await browser.newPage()

    // Set content
    await page.setContent(generateHTML(type, data, template))

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    })

    // Close browser
    await browser.close()

    // Return PDF
    return new Response(
      pdf,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}_${id}.pdf"`
        }
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

function generateHTML(type: string, data: any, template?: string): string {
  // If custom template is provided, use it
  if (template) {
    return template
      .replace(/{{([^}]+)}}/g, (match, key) => {
        return getNestedValue(data, key.trim()) || ''
      })
  }

  // Default templates
  const companyInfo = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0;">LawnBoss</h1>
      <p style="margin: 5px 0;">Professional Lawn Care Services</p>
      <p style="margin: 5px 0;">123 Main St, City, State 12345</p>
      <p style="margin: 5px 0;">Phone: (555) 123-4567</p>
      <p style="margin: 5px 0;">Email: info@lawnboss.com</p>
    </div>
  `

  const customerInfo = `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #4b5563; margin-bottom: 10px;">Bill To:</h3>
      <p style="margin: 5px 0;">${data.customer.first_name} ${data.customer.last_name}</p>
      <p style="margin: 5px 0;">${data.customer.billing_address}</p>
      <p style="margin: 5px 0;">${data.customer.billing_city}, ${data.customer.billing_state} ${data.customer.billing_zip}</p>
      <p style="margin: 5px 0;">Phone: ${data.customer.phone}</p>
      <p style="margin: 5px 0;">Email: ${data.customer.email}</p>
    </div>
  `

  const documentInfo = `
    <div style="margin-bottom: 30px; text-align: right;">
      <h2 style="color: #2563eb; margin-bottom: 10px;">${type === 'invoice' ? 'Invoice' : 'Estimate'} #${type === 'invoice' ? data.invoice_number : data.id}</h2>
      <p style="margin: 5px 0;">Date: ${new Date(data.created_at).toLocaleDateString()}</p>
      ${type === 'invoice' ? `<p style="margin: 5px 0;">Due Date: ${new Date(data.due_date).toLocaleDateString()}</p>` : ''}
      ${type === 'estimate' ? `<p style="margin: 5px 0;">Valid Until: ${new Date(data.valid_until).toLocaleDateString()}</p>` : ''}
    </div>
  `

  const itemsTable = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Quantity</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Tax</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item: any) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              ${type === 'invoice' 
                ? item.service_schedule.description 
                : `${item.service_type.name} - ${item.description}`}
            </td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
              ${type === 'invoice' ? '1' : item.quantity}
            </td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
              $${type === 'invoice' ? item.amount.toFixed(2) : item.unit_price.toFixed(2)}
            </td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
              $${item.tax_amount.toFixed(2)}
            </td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
              $${(type === 'invoice' ? item.amount : item.total).toFixed(2)}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding: 12px;"></td>
          <td style="padding: 12px; text-align: right; font-weight: bold;">Subtotal:</td>
          <td style="padding: 12px; text-align: right;">$${data.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 12px;"></td>
          <td style="padding: 12px; text-align: right; font-weight: bold;">Tax:</td>
          <td style="padding: 12px; text-align: right;">$${data.tax_amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 12px;"></td>
          <td style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
          <td style="padding: 12px; text-align: right; font-weight: bold;">$${data.total_amount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  `

  const notes = data.notes ? `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #4b5563; margin-bottom: 10px;">Notes:</h3>
      <p style="margin: 0; white-space: pre-wrap;">${data.notes}</p>
    </div>
  ` : ''

  const footer = `
    <div style="text-align: center; margin-top: 50px; color: #6b7280; font-size: 14px;">
      <p style="margin: 5px 0;">Thank you for your business!</p>
      <p style="margin: 5px 0;">
        ${type === 'invoice' 
          ? 'Please make checks payable to LawnBoss or visit our website for online payment options.' 
          : 'This estimate is valid for 30 days from the date of issue.'}
      </p>
    </div>
  `

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${type === 'invoice' ? 'Invoice' : 'Estimate'} #${type === 'invoice' ? data.invoice_number : data.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
          }
        </style>
      </head>
      <body>
        ${companyInfo}
        ${documentInfo}
        ${customerInfo}
        ${itemsTable}
        ${notes}
        ${footer}
      </body>
    </html>
  `
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
} 