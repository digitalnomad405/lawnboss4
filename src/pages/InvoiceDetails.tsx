import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { useSupabase } from '../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface InvoiceDetails {
  id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance: number;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  payment_terms: number;
  tax_exempt: boolean;
  created_at: string;
  updated_at: string;
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
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;
    service: {
      id: string;
      scheduled_date: string;
      service_type: {
        label: string;
        base_price: number;
      };
      property: {
        address_line1: string;
        city: string;
        state: string;
      };
    };
  }>;
}

const InvoiceDetailsContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { supabase } = useSupabase();

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
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
            id,
            description,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            subtotal,
            total,
            service:service_schedules (
              id,
              scheduled_date,
              service_type:service_types (
                label,
                base_price
              ),
              property:properties (
                address_line1,
                city,
                state
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data ? {
        ...data,
        subtotal: data.subtotal ?? 0,
        tax_amount: data.tax_amount ?? 0,
        total: data.total ?? 0,
        amount_paid: data.amount_paid ?? 0,
        balance: data.balance ?? 0,
        items: (data.items ?? []).map(item => ({
          ...item,
          quantity: item.quantity ?? 0,
          unit_price: item.unit_price ?? 0,
          tax_rate: item.tax_rate ?? 0,
          tax_amount: item.tax_amount ?? 0,
          subtotal: item.subtotal ?? 0,
          total: item.total ?? 0,
          service: item.service
        }))
      } : null;

      setInvoice(transformedData);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError(err as Error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus: InvoiceDetails['status']) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await fetchInvoiceDetails();
      toast.success('Invoice status updated successfully!');
    } catch (err) {
      console.error('Error updating invoice status:', err);
      toast.error('Failed to update invoice status');
    }
  };

  const getStatusColor = (status: InvoiceDetails['status']) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 dark:text-green-400';
      case 'sent':
        return 'text-blue-600 dark:text-blue-400';
      case 'overdue':
        return 'text-red-600 dark:text-red-400';
      case 'cancelled':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status: InvoiceDetails['status']) => {
    switch (status) {
      case 'paid':
        return CheckCircleIcon;
      case 'sent':
        return DocumentTextIcon;
      case 'overdue':
        return ExclamationCircleIcon;
      case 'cancelled':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading invoice details...</p>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/invoices')}
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
            onClick={() => navigate(`/invoices/${invoice.id}/view`)}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <DocumentTextIcon className="-ml-1 mr-2 h-5 w-5" />
            View PDF
          </motion.button>

          {invoice.status === 'pending' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStatusUpdate('sent')}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <PaperAirplaneIcon className="-ml-1 mr-2 h-5 w-5" />
              Send Invoice
            </motion.button>
          )}
          {invoice.status === 'sent' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStatusUpdate('paid')}
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
              Mark as Paid
            </motion.button>
          )}
          {(invoice.status === 'pending' || invoice.status === 'sent') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStatusUpdate('cancelled')}
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <XCircleIcon className="-ml-1 mr-2 h-5 w-5" />
              Cancel
            </motion.button>
          )}
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Invoice Details */}
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Invoice Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                </div>
                <span className={`font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Created</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {invoice.created_at && new Date(invoice.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Due Date</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Amount</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    ${invoice.total.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Balance: ${invoice.balance.toFixed(2)}
                  </div>
                </div>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                  </div>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ${invoice.amount_paid.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Services
            </h2>
            <div className="space-y-4">
              {invoice.items?.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {item.description}
                    </h3>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        ${(item.total ?? 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(item.quantity ?? 0)} x ${(item.unit_price ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{item.service?.scheduled_date ? new Date(item.service.scheduled_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      <HomeIcon className="h-4 w-4" />
                      <span>
                        {item.service?.property ? `${item.service.property.address_line1}, ${item.service.property.city}, ${item.service.property.state}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-white">${(invoice.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="font-medium text-gray-900 dark:text-white">${(invoice.tax_amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span className="font-medium text-gray-900 dark:text-white">Total</span>
                  <span className="font-medium text-gray-900 dark:text-white">${(invoice.total ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Customer Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {invoice.customer.first_name} {invoice.customer.last_name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <a
                  href={`mailto:${invoice.customer.email}`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {invoice.customer.email}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <a
                  href={`tel:${invoice.customer.phone}`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {invoice.customer.phone}
                </a>
              </div>
              <div className="pt-4">
                <h3 className="mb-2 font-medium text-gray-900 dark:text-white">Billing Address</h3>
                <address className="not-italic text-gray-600 dark:text-gray-400">
                  {invoice.customer.billing_address}<br />
                  {invoice.customer.billing_city}, {invoice.customer.billing_state} {invoice.customer.billing_zip}
                </address>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Notes</h2>
              <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const InvoiceDetails = () => {
  return (
    <ErrorBoundary>
      <InvoiceDetailsContent />
    </ErrorBoundary>
  );
}; 