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
  description: {
    margin: 10,
    padding: 10,
    fontSize: 12,
    color: '#666'
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
  },
  notes: {
    marginTop: 30,
    padding: 10,
    fontSize: 10,
    color: '#666',
    borderTopWidth: 1,
    borderTopColor: '#bfbfbf'
  },
  validUntil: {
    marginTop: 20,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  }
});

interface EstimateData {
  id: string;
  title: string;
  description: string;
  created_at: string;
  valid_until: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  property: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip_code: string;
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

export const EstimatePDFViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();

  useEffect(() => {
    fetchEstimateData();
  }, [id]);

  const fetchEstimateData = async () => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          customer:customers (
            first_name,
            last_name,
            email,
            phone
          ),
          property:properties (
            address_line1,
            address_line2,
            city,
            state,
            zip_code
          ),
          items:estimate_items (
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
      setEstimate(data);
    } catch (err) {
      console.error('Error fetching estimate:', err);
      toast.error('Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!estimate?.customer.email) {
      toast.error('Customer email not available');
      return;
    }

    try {
      // TODO: Implement email sending
      const { error } = await supabase.functions.invoke('send-estimate-email', {
        body: { estimateId: id }
      });

      if (error) throw error;
      toast.success('Estimate sent via email successfully!');
    } catch (err) {
      console.error('Error sending email:', err);
      toast.error('Failed to send email');
    }
  };

  const handleSendText = async () => {
    if (!estimate?.customer.phone) {
      toast.error('Customer phone number not available');
      return;
    }

    try {
      // TODO: Implement SMS sending
      const { error } = await supabase.functions.invoke('send-estimate-sms', {
        body: { estimateId: id }
      });

      if (error) throw error;
      toast.success('Estimate sent via text successfully!');
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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p className="text-yellow-800 dark:text-yellow-400">Estimate not found</p>
      </div>
    );
  }

  const EstimatePDF = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text>Estimate: {estimate.title}</Text>
        </View>

        <View style={styles.section}>
          <Text>Prepared For:</Text>
          <Text>{estimate.customer.first_name} {estimate.customer.last_name}</Text>
          <Text>{estimate.property.address_line1}</Text>
          {estimate.property.address_line2 && <Text>{estimate.property.address_line2}</Text>}
          <Text>{estimate.property.city}, {estimate.property.state} {estimate.property.zip_code}</Text>
        </View>

        <View style={styles.description}>
          <Text>{estimate.description}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Service</Text>
            <Text style={styles.tableCell}>Quantity</Text>
            <Text style={styles.tableCell}>Unit Price</Text>
            <Text style={styles.tableCell}>Tax</Text>
            <Text style={styles.tableCell}>Total</Text>
          </View>
          {estimate.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.description}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>${item.unit_price.toFixed(2)}</Text>
              <Text style={styles.tableCell}>${item.tax_amount.toFixed(2)}</Text>
              <Text style={styles.tableCell}>${item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.total}>
          <Text>Subtotal: ${estimate.subtotal.toFixed(2)}</Text>
          <Text>Tax: ${estimate.tax_amount.toFixed(2)}</Text>
          <Text>Total: ${estimate.total_amount.toFixed(2)}</Text>
        </View>

        {estimate.notes && (
          <View style={styles.notes}>
            <Text>Notes:</Text>
            <Text>{estimate.notes}</Text>
          </View>
        )}

        <View style={styles.validUntil}>
          <Text>Valid until: {new Date(estimate.valid_until).toLocaleDateString()}</Text>
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
            onClick={() => navigate(`/estimates/${id}`)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </motion.button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {estimate.title}
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
          <EstimatePDF />
        </PDFViewer>
      </div>
    </div>
  );
}; 