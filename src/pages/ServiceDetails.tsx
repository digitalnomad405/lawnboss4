import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { useSupabase } from '../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PhoneNumber } from '../components/ui/PhoneNumber';

interface ServiceDetails {
  id: string;
  property_id: string;
  service_type_id: string | null;
  assigned_technician_id: string | null;
  scheduled_date: string;
  scheduled_time_window: 'morning' | 'afternoon' | 'evening';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  base_price: number | null;
  is_recurring: boolean;
  recurring_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  next_service_date?: string;
  description: string | null;
  property: {
    address_line1: string;
    city: string;
    state: string;
    customer: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
    };
  };
  service_type: {
    label: string;
    base_price: number;
  } | null;
  technician?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

const ServiceDetailsContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<ServiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { supabase } = useSupabase();

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_schedules')
        .select(`
          *,
          property:properties (
            address_line1,
            city,
            state,
            customer:customers (
              id,
              first_name,
              last_name,
              phone,
              email
            )
          ),
          service_type:service_types (
            label,
            base_price
          ),
          technician:technicians (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setService(data);
    } catch (err) {
      console.error('Error fetching service details:', err);
      setError(err as Error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus: ServiceDetails['status']) => {
    try {
      const { error } = await supabase
        .from('service_schedules')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // If service is marked as completed, generate an invoice
      if (newStatus === 'completed') {
        // Get the default tax configuration
        const { data: taxConfig, error: taxError } = await supabase
          .from('tax_configurations')
          .select('*')
          .eq('is_default', true)
          .single();

        if (taxError) {
          console.error('Error fetching tax configuration:', taxError);
          // Continue with 0 tax rate if no tax config found
        }

        const taxRate = taxConfig?.rate || 0;

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            customer_id: service.property.customer.id,
            property_id: service.property.id,
            service_schedule_id: id,
            invoice_number: `INV-${new Date().getTime()}`,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total: service.base_price * (1 + taxRate),
            subtotal: service.base_price,
            tax_amount: service.base_price * taxRate,
            status: 'draft'
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Create invoice item
        const { error: itemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            service_schedule_id: id,
            description: service.description || service.service_type?.label || 'Service',
            quantity: 1,
            unit_price: service.base_price || 0,
            tax_rate: taxRate
          });

        if (itemError) throw itemError;

        toast.success('Service completed and invoice generated!');
      } else {
        toast.success('Service status updated successfully!');
      }

      await fetchServiceDetails();
    } catch (err) {
      console.error('Error updating service status:', err);
      toast.error('Failed to update service status');
    }
  };

  const getStatusColor = (status: ServiceDetails['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTimeWindowLabel = (timeWindow: ServiceDetails['scheduled_time_window']) => {
    switch (timeWindow) {
      case 'morning':
        return '8:00 AM - 12:00 PM';
      case 'afternoon':
        return '12:00 PM - 4:00 PM';
      case 'evening':
        return '4:00 PM - 8:00 PM';
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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p className="text-yellow-800 dark:text-yellow-400">Service not found</p>
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
            onClick={() => navigate('/services')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </motion.button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Service Details
          </h1>
        </div>
        <div className="flex space-x-2">
          {service.status !== 'completed' && service.status !== 'cancelled' && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatusUpdate('completed')}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                Mark Complete
              </motion.button>
              {service.status === 'pending' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStatusUpdate('in_progress')}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <WrenchScrewdriverIcon className="-ml-1 mr-2 h-5 w-5" />
                  Start Service
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatusUpdate('cancelled')}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <XCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                Cancel
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Service Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Service Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Service Type</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {service.service_type ? service.service_type.label : 'Custom Service'}
              </span>
            </div>
            {service.description && !service.service_type && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Description</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {service.description}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Date</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(service.scheduled_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Time Window</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {getTimeWindowLabel(service.scheduled_time_window)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Price</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                ${service.base_price || service.service_type?.base_price}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon icon={WrenchScrewdriverIcon} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Status</span>
              </div>
              <span className={`font-medium ${getStatusColor(service.status)}`}>
                {service.status.charAt(0).toUpperCase() + service.status.slice(1).replace('_', ' ')}
              </span>
            </div>
            {service.is_recurring && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Recurring</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {service.recurring_frequency?.charAt(0).toUpperCase() + service.recurring_frequency?.slice(1)}
                  </span>
                </div>
                {service.next_service_date && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Next Service</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(service.next_service_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Property Info */}
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Property Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <HomeIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {service.property.address_line1}
                </span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {service.property.city}, {service.property.state}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Customer Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {service.property.customer.first_name} {service.property.customer.last_name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
                <a
                  href={`mailto:${service.property.customer.email}`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {service.property.customer.email}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
                <a
                  href={`tel:${service.property.customer.phone}`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  <PhoneNumber number={service.property.customer.phone} />
                </a>
              </div>
            </div>
          </div>

          {/* Technician Info */}
          {service.technician && (
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                Technician Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {service.technician.first_name} {service.technician.last_name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
                  <a
                    href={`tel:${service.technician.phone}`}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {service.technician.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {service.notes && (
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Notes</h2>
          <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">{service.notes}</p>
        </div>
      )}
    </div>
  );
};

export const ServiceDetails = () => {
  return (
    <ErrorBoundary>
      <ServiceDetailsContent />
    </ErrorBoundary>
  );
}; 