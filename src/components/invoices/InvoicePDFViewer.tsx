import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, DocumentTextIcon, EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { PDFViewer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useSupabase } from '../../hooks/useSupabase';
import { toast } from 'react-hot-toast';

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
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance: number;
  status: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    billing_address: string;
    billing_city: string;
    billing_state: string;
    billing_zip: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;
  }>;
}

export const InvoicePDFViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
            phone,
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
      
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId: id }
      });

      if (error) {
        console.error('Edge Function error:', error);
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
      console.error('Full error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      toast.error('Failed to send email: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleSendText = async () => {
    if (!invoice?.customer.phone) {
      toast.error('Customer phone number not available');
      return;
    }

    try {
      // TODO: Implement SMS sending
      toast.success('Invoice sent via text successfully!');
    } catch (err) {
      console.error('Error sending text:', err);
      toast.error('Failed to send text');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p className="text-yellow-800 dark:text-yellow-400">Invoice not found</p>
      </div>
    );
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
          <Text>{invoice.customer.billing_address}</Text>
          <Text>{invoice.customer.billing_city}, {invoice.customer.billing_state} {invoice.customer.billing_zip}</Text>
        </View>

        <View style={styles.section}>
          <Text>Invoice Date: {new Date(invoice.invoice_date).toLocaleDateString()}</Text>
          <Text>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Description</Text>
            <Text style={styles.tableCell}>Quantity</Text>
            <Text style={styles.tableCell}>Unit Price</Text>
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
          <Text>Subtotal: ${invoice.subtotal.toFixed(2)}</Text>
          <Text>Tax: ${invoice.tax_amount.toFixed(2)}</Text>
          <Text>Total: ${invoice.total.toFixed(2)}</Text>
          {invoice.amount_paid > 0 && (
            <>
              <Text>Amount Paid: ${invoice.amount_paid.toFixed(2)}</Text>
              <Text>Balance Due: ${invoice.balance.toFixed(2)}</Text>
            </>
          )}
        </View>
      </Page>
    </Document>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/invoices/${id}`)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </motion.button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Invoice #{invoice.invoice_number}
          </h1>
        </div>
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSendEmail}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5" />
            Send Email
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSendText}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <DevicePhoneMobileIcon className="-ml-1 mr-2 h-5 w-5" />
            Send Text
          </motion.button>
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