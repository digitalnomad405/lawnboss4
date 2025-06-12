import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { useSupabase } from '../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { CreateInvoiceModal } from '../components/invoices/CreateInvoiceModal';

interface Invoice {
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
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  payment_terms?: number;
  tax_exempt: boolean;
  property_id?: string;
  service_schedule_id?: string;
  created_at: string;
  updated_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  services: Array<{
    id: string;
    service_type: {
      label: string;
      base_price: number;
    };
    scheduled_date: string;
    property: {
      address_line1: string;
      city: string;
      state: string;
    };
  }>;
}

const InvoicesList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          subtotal,
          tax_amount,
          total,
          amount_paid,
          status,
          notes,
          created_at,
          updated_at,
          customer:customers (
            first_name,
            last_name,
            email
          ),
          items:invoice_items (
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
        .order('due_date', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map(invoice => ({
        ...invoice,
        total: invoice.total ?? 0,
        subtotal: invoice.subtotal ?? 0,
        tax_amount: invoice.tax_amount ?? 0,
        amount_paid: invoice.amount_paid ?? 0,
        balance: invoice.balance ?? 0,
        services: (invoice.items ?? []).map(item => ({
          id: item.service.id,
          service_type: item.service.service_type,
          scheduled_date: item.service.scheduled_date,
          property: item.service.property
        }))
      })) || [];

      setInvoices(transformedData);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err as Error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getStatusColor = (status: Invoice['status']) => {
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

  const getStatusIcon = (status: Invoice['status']) => {
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

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = (
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${invoice.customer.first_name} ${invoice.customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateInvoice = async (invoiceData: any) => {
    await fetchInvoices();
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Invoices</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Create Invoice
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search invoices by number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div className="flex-shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Invoice['status'] | 'all')}
            className="block w-full rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading invoices...</p>
            </div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center p-6">
            <p className="text-gray-500 dark:text-gray-400">
              No invoices found matching your criteria.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredInvoices.map((invoice) => (
              <motion.li
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="cursor-pointer p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${invoice.status === 'paid' ? 'green' : invoice.status === 'sent' ? 'blue' : invoice.status === 'overdue' ? 'red' : 'gray'}-100 ${getStatusColor(invoice.status)} dark:bg-${invoice.status === 'paid' ? 'green' : invoice.status === 'sent' ? 'blue' : invoice.status === 'overdue' ? 'red' : 'gray'}-900/20`}>
                          <Icon icon={getStatusIcon(invoice.status)} />
                        </div>
                        <div>
                          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                            Invoice #{invoice.invoice_number}
                          </h2>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Icon icon={CalendarIcon} className="mr-1.5" size="sm" />
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Icon icon={UserIcon} className="mr-1.5" size="sm" />
                              {invoice.customer.first_name} {invoice.customer.last_name}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          ${(invoice.total ?? 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Balance: ${(invoice.balance ?? 0).toFixed(2)}
                        </p>
                        <p className={`mt-1 text-sm ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Services</h3>
                      <ul className="mt-2 space-y-2">
                        {invoice.services?.map((service) => (
                          <li key={service.id} className="text-sm text-gray-500 dark:text-gray-400">
                            {service.service_type.label} - {service.property.address_line1}, {service.property.city}
                          </li>
                        )) ?? []}
                      </ul>
                      {invoice.tax_exempt && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          (Tax Exempt)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateInvoice={handleCreateInvoice}
      />
    </div>
  );
};

export const Invoices = () => {
  return (
    <ErrorBoundary>
      <InvoicesList />
    </ErrorBoundary>
  );
}; 