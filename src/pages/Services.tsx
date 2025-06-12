import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  UserIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { useSupabase } from '../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import { ScheduleServiceModal } from '../components/services/ScheduleServiceModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { subscriptionManager } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ServiceSchedule {
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
      first_name: string;
      last_name: string;
    };
  };
  service_type: {
    label: string;
    base_price: number;
  } | null;
  technician?: {
    first_name: string;
    last_name: string;
  };
}

const ServicesList = () => {
  const [services, setServices] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const fetchServices = async () => {
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
              first_name,
              last_name
            )
          ),
          service_type:service_types (
            label,
            base_price
          ),
          technician:technicians (
            first_name,
            last_name
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err as Error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();

    // Set up subscription using the subscription manager
    const cleanup = subscriptionManager.subscribe('service_schedules_changes', fetchServices);

    // Cleanup function
    return cleanup;
  }, []);

  const handleScheduleService = async (serviceData: any) => {
    try {
      // No need to insert the service here since it's already created in the modal
      await fetchServices();
    } catch (err) {
      console.error('Error refreshing services:', err);
      toast.error('Failed to refresh services list');
    }
  };

  const getStatusColor = (status: ServiceSchedule['status']) => {
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

  const getTimeWindowLabel = (timeWindow: ServiceSchedule['scheduled_time_window']) => {
    switch (timeWindow) {
      case 'morning':
        return '8:00 AM - 12:00 PM';
      case 'afternoon':
        return '12:00 PM - 4:00 PM';
      case 'evening':
        return '4:00 PM - 8:00 PM';
    }
  };

  const filteredServices = services.filter((service) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      service.property.address_line1.toLowerCase().includes(searchLower) ||
      service.property.customer.first_name.toLowerCase().includes(searchLower) ||
      service.property.customer.last_name.toLowerCase().includes(searchLower) ||
      service.service_type?.label.toLowerCase().includes(searchLower) ||
      (service.technician?.first_name.toLowerCase().includes(searchLower) || false) ||
      (service.technician?.last_name.toLowerCase().includes(searchLower) || false)
    );
  });

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Services</h1>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Schedule Service
          </motion.button>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search services, customers, or properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Services List */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading services...</p>
              </div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center p-6">
              <p className="text-gray-500 dark:text-gray-400">
                No services found matching your criteria.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredServices.map((service) => (
                <motion.li
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="cursor-pointer p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => navigate(`/services/${service.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${service.status === 'completed' ? 'green' : service.status === 'in_progress' ? 'blue' : service.status === 'cancelled' ? 'red' : 'gray'}-100 ${getStatusColor(service.status)} dark:bg-${service.status === 'completed' ? 'green' : service.status === 'in_progress' ? 'blue' : service.status === 'cancelled' ? 'red' : 'gray'}-900/20`}>
                            <Icon 
                              icon={
                                service.status === 'completed' 
                                  ? CheckCircleIcon 
                                  : service.status === 'cancelled' 
                                  ? XCircleIcon 
                                  : WrenchScrewdriverIcon
                              } 
                            />
                          </div>
                          <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                              {service.service_type ? service.service_type.label : 'Custom Service'}
                              {!service.service_type && service.description && (
                                <span className="ml-2 text-sm text-gray-500">
                                  - {service.description}
                                </span>
                              )}
                            </h2>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <Icon icon={CalendarIcon} className="mr-1.5" size="sm" />
                                {new Date(service.scheduled_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Icon icon={ClockIcon} className="mr-1.5" size="sm" />
                                {getTimeWindowLabel(service.scheduled_time_window)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            ${service.base_price}
                          </p>
                          <p className={`mt-1 text-sm ${getStatusColor(service.status)}`}>
                            {service.status.charAt(0).toUpperCase() + service.status.slice(1).replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Icon icon={HomeIcon} className="mr-1.5" size="sm" />
                          {service.property.address_line1}, {service.property.city}, {service.property.state}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Icon icon={UserIcon} className="mr-1.5" size="sm" />
                          {service.property.customer.first_name} {service.property.customer.last_name}
                          {service.technician && (
                            <span className="ml-2 text-gray-400">
                              • Tech: {service.technician.first_name} {service.technician.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ScheduleServiceModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleScheduleService}
      />
    </>
  );
};

export const Services = () => {
  return (
    <ErrorBoundary>
      <ServicesList />
    </ErrorBoundary>
  );
}; 