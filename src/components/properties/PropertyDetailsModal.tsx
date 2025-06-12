import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  MapPinIcon,
  UserIcon,
  Square2StackIcon,
  CalendarIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  BoltIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';
import { useSupabase } from '../../hooks/useSupabase';
import { ServiceHistoryModal } from './ServiceHistoryModal';
import { EditPropertyModal } from './EditPropertyModal';

interface PropertyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    customer_id: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip_code: string;
    property_size: number | null;
    lawn_size: number | null;
    has_irrigation: boolean;
    has_pets: boolean;
    created_at?: string;
    updated_at?: string;
  };
  onPropertyUpdate?: () => void;
}

export const PropertyDetailsModal = ({ isOpen, onClose, property, onPropertyUpdate }: PropertyDetailsModalProps) => {
  const [customer, setCustomer] = useState<{ first_name: string; last_name: string; email: string; phone: string } | null>(null);
  const [isServiceHistoryModalOpen, setIsServiceHistoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('first_name, last_name, email, phone')
          .eq('id', property.customer_id)
          .single();

        if (error) throw error;
        setCustomer(data);
      } catch (err) {
        console.error('Error fetching customer:', err);
      }
    };

    if (property.customer_id) {
      fetchCustomer();
    }
  }, [property.customer_id, supabase]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const handleScheduleService = () => {
    // TODO: Implement service scheduling
    console.log('Schedule service for property:', property.id);
  };

  const handleViewHistory = () => {
    setIsServiceHistoryModalOpen(true);
  };

  const handleClose = () => {
    if (!isEditModalOpen && !isServiceHistoryModalOpen) {
      onClose();
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    onPropertyUpdate?.();
  };

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                        Property Details
                      </Dialog.Title>

                      <div className="mt-6 space-y-6">
                        {/* Customer Info */}
                        {customer && (
                          <div className="rounded-lg bg-primary-50 p-4 dark:bg-primary-900/20">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                                <Icon icon={UserIcon} />
                              </div>
                              <div>
                                <h4 className="font-medium text-primary-900 dark:text-primary-100">
                                  {customer.first_name} {customer.last_name}
                                </h4>
                                <div className="mt-1 space-y-1">
                                  <p className="flex items-center text-sm text-primary-700 dark:text-primary-300">
                                    <Icon icon={ChatBubbleLeftIcon} className="mr-1.5" size="sm" />
                                    {customer.email}
                                  </p>
                                  <p className="flex items-center text-sm text-primary-700 dark:text-primary-300">
                                    <Icon icon={PhoneIcon} className="mr-1.5" size="sm" />
                                    {customer.phone}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Location Info */}
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                              <Icon icon={HomeIcon} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {property.address_line1}
                                {property.address_line2 && `, ${property.address_line2}`}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {property.city}, {property.state} {property.zip_code}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Property Details */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                            <h4 className="flex items-center font-medium text-blue-900 dark:text-blue-100">
                              <Icon icon={Square2StackIcon} className="mr-2" />
                              Property Size
                            </h4>
                            <div className="mt-2 space-y-2">
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                Total Area: {property.property_size ? `${property.property_size.toLocaleString()} sq ft` : 'Not specified'}
                              </p>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                Lawn Area: {property.lawn_size ? `${property.lawn_size.toLocaleString()} sq ft` : 'Not specified'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                            <h4 className="flex items-center font-medium text-purple-900 dark:text-purple-100">
                              <Icon icon={WrenchScrewdriverIcon} className="mr-2" />
                              Features
                            </h4>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Icon 
                                  icon={BoltIcon} 
                                  className={property.has_irrigation ? 'text-purple-600' : 'text-gray-400'} 
                                  size="sm" 
                                />
                                <span className={`text-sm ${property.has_irrigation ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                  Irrigation System
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Icon 
                                  icon={ShieldCheckIcon} 
                                  className={property.has_pets ? 'text-purple-600' : 'text-gray-400'} 
                                  size="sm" 
                                />
                                <span className={`text-sm ${property.has_pets ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                  Pets on Property
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid gap-4 sm:grid-cols-3">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleScheduleService}
                            className="flex items-center justify-center space-x-2 rounded-lg bg-green-50 p-4 text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
                          >
                            <Icon icon={CalendarIcon} />
                            <span className="text-sm font-medium">Schedule Service</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleViewHistory}
                            className="flex items-center justify-center space-x-2 rounded-lg bg-blue-50 p-4 text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                          >
                            <Icon icon={CalendarIcon} />
                            <span className="text-sm font-medium">Service History</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleEditClick}
                            className="flex items-center justify-center space-x-2 rounded-lg bg-gray-50 p-4 text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-700/30 dark:text-gray-300 dark:hover:bg-gray-700/40"
                          >
                            <Icon icon={MapPinIcon} />
                            <span className="text-sm font-medium">Edit Property</span>
                          </motion.button>
                        </div>

                        {/* Timestamps */}
                        {(property.created_at || property.updated_at) && (
                          <div className="mt-4 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {property.created_at && (
                              <p>Created: {new Date(property.created_at).toLocaleString()}</p>
                            )}
                            {property.updated_at && (
                              <p>Last Updated: {new Date(property.updated_at).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Close button */}
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

      <ServiceHistoryModal
        isOpen={isServiceHistoryModalOpen}
        onClose={() => setIsServiceHistoryModalOpen(false)}
        propertyId={property.id}
      />

      <EditPropertyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        property={property}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}; 