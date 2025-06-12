import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';
import { useSupabase } from '../../hooks/useSupabase';
import { toast } from 'react-hot-toast';

interface ServiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
}

interface ServiceRecord {
  id: string;
  scheduled_date: string;
  scheduled_time_window: string;
  status: string;
  base_price: number;
  service_type: {
    label: string;
  };
  technician: {
    first_name: string;
    last_name: string;
  } | null;
  completion: {
    completed_at: string;
    completion_notes: string;
  } | null;
}

export const ServiceHistoryModal = ({ isOpen, onClose, propertyId }: ServiceHistoryModalProps) => {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();

  useEffect(() => {
    if (isOpen) {
      fetchServiceHistory();
    }
  }, [isOpen, propertyId]);

  const fetchServiceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('service_schedules')
        .select(`
          id,
          scheduled_date,
          scheduled_time_window,
          status,
          base_price,
          service_type:service_types (
            label
          ),
          technician:technicians (
            first_name,
            last_name
          ),
          completion:service_completions (
            completed_at,
            completion_notes
          )
        `)
        .eq('property_id', propertyId)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching service history:', err);
      toast.error('Failed to load service history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 text-left shadow-xl transition-all dark:bg-gray-800 sm:my-8">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none dark:hover:text-gray-300"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <Icon icon={XMarkIcon} />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      Service History
                    </Dialog.Title>

                    <div className="mt-6">
                      {loading ? (
                        <div className="flex min-h-[200px] items-center justify-center">
                          <div className="text-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading service history...</p>
                          </div>
                        </div>
                      ) : services.length === 0 ? (
                        <div className="flex min-h-[200px] items-center justify-center">
                          <p className="text-gray-500 dark:text-gray-400">No service history found.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {services.map((service) => (
                            <motion.div
                              key={service.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${service.status === 'completed' ? 'green' : service.status === 'in_progress' ? 'blue' : service.status === 'cancelled' ? 'red' : 'yellow'}-100 ${getStatusColor(service.status)} dark:bg-${service.status === 'completed' ? 'green' : service.status === 'in_progress' ? 'blue' : service.status === 'cancelled' ? 'red' : 'yellow'}-900/20`}>
                                    <Icon icon={WrenchScrewdriverIcon} />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {service.service_type.label}
                                    </h4>
                                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                      <div className="flex items-center">
                                        <Icon icon={CalendarIcon} className="mr-1.5" size="sm" />
                                        {new Date(service.scheduled_date).toLocaleDateString()}
                                      </div>
                                      <div className="flex items-center">
                                        <Icon icon={ClockIcon} className="mr-1.5" size="sm" />
                                        {service.scheduled_time_window}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(service.status)} bg-${service.status === 'completed' ? 'green' : service.status === 'in_progress' ? 'blue' : service.status === 'cancelled' ? 'red' : 'yellow'}-100 dark:bg-${service.status === 'completed' ? 'green' : service.status === 'in_progress' ? 'blue' : service.status === 'cancelled' ? 'red' : 'yellow'}-900/20`}>
                                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                                  </span>
                                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                    ${service.base_price.toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              {service.technician && (
                                <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  <Icon icon={UserIcon} className="mr-1.5" size="sm" />
                                  Technician: {service.technician.first_name} {service.technician.last_name}
                                </div>
                              )}

                              {service.completion && (
                                <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/30">
                                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                    <Icon icon={CheckCircleIcon} className="mr-1.5" size="sm" />
                                    Completed: {new Date(service.completion.completed_at).toLocaleString()}
                                  </div>
                                  {service.completion.completion_notes && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                      {service.completion.completion_notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        Close
                      </motion.button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}; 