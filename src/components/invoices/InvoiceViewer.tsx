import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import { PDFViewer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold'
  },
  section: {
    margin: 10,
    padding: 10
  },
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginVertical: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf'
  },
  tableCell: {
    padding: 5,
    flex: 1
  },
  total: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold'
  }
});

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total: number;
  tax_amount: number;
  status: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_amount: number;
    total: number;
  }>;
}

export const InvoiceViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

  const fetchInvoiceData = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers (
            first_name,
            last_name,
            email,
            phone
          ),
          items:invoice_items (
            description,
            quantity,
            unit_price,
            tax_amount,
            total
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice?.customer.email) {
      toast.error('Customer email not available');
      return;
    }

    try {
      console.log('Attempting to send invoice email for ID:', id);
      console.log('Customer email:', invoice.customer.email);
      
      // Log the function invocation details
      console.log('Invoking Edge Function with:', {
        functionName: 'send-invoice-email',
        body: { invoiceId: id }
      });

      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId: id }
      });

      // Log the complete response
      console.log('Edge Function complete response:', {
        data,
        error,
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack,
        errorCause: error?.cause
      });

      if (error) {
        console.error('Edge Function error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
          context: error.context,
          details: error.details
        });
        throw error;
      }

      console.log('Email function response:', data);
      
      // Update invoice status to sent
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        throw updateError;
      }

      toast.success('Invoice sent via email successfully!');
      // Refresh invoice data to show updated status
      fetchInvoiceData();
    } catch (err) {
      // Enhanced error logging
      console.error('Send email error details:', {
        error: err,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause,
        context: err?.context,
        details: err?.details,
        toString: err?.toString(),
        constructor: err?.constructor?.name,
        prototype: Object.getPrototypeOf(err)?.constructor?.name
      });

      // Check if it's a FunctionsFetchError
      if (err?.name === 'FunctionsFetchError') {
        console.error('Function Fetch Error details:', {
          message: err.message,
          cause: err.cause,
          context: err.context
        });
        toast.error(`Failed to reach Edge Function. Please check if the function is deployed and accessible.`);
      } else {
        toast.error(`Failed to send email: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
      }

      // If email fails, revert status
      await supabase
        .from('invoices')
        .update({ status: 'draft' })
        .eq('id', id);
    }
  };

  const handleSendText = async () => {
    if (!invoice?.customer.phone) {
      toast.error('Customer phone number not available');
      return;
    }

    try {
      // TODO: Implement SMS sending logic
      const { error } = await supabase.functions.invoke('send-invoice-sms', {
        body: { invoiceId: id, phone: invoice.customer.phone }
      });

      if (error) throw error;
      toast.success('Invoice sent via text successfully!');
    } catch (err) {
      console.error('Error sending text:', err);
      toast.error('Failed to send text');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  const InvoicePDF = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text>Invoice #{invoice.invoice_number}</Text>
        </View>
        
        <View style={styles.section}>
          <Text>Bill To:</Text>
          <Text>{invoice.customer.first_name} {invoice.customer.last_name}</Text>
          <Text>Date: {new Date(invoice.invoice_date).toLocaleDateString()}</Text>
          <Text>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Description</Text>
            <Text style={styles.tableCell}>Quantity</Text>
            <Text style={styles.tableCell}>Price</Text>
            <Text style={styles.tableCell}>Total</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.description}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>${item.unit_price.toFixed(2)}</Text>
              <Text style={styles.tableCell}>${item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.total}>
          <Text>Subtotal: ${(invoice.total - invoice.tax_amount).toFixed(2)}</Text>
          <Text>Tax: ${invoice.tax_amount.toFixed(2)}</Text>
          <Text>Total: ${invoice.total.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Invoice #{invoice.invoice_number}
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={handleSendEmail}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5" />
            Send Email
          </button>
          <button
            onClick={handleSendText}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <DevicePhoneMobileIcon className="-ml-1 mr-2 h-5 w-5" />
            Send Text
          </button>
        </div>
      </div>

      <div className="h-screen">
        <PDFViewer className="h-full w-full rounded-lg">
          <InvoicePDF />
        </PDFViewer>
      </div>
    </div>
  );
}; 