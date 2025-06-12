import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { toast } from 'react-hot-toast';
import { EditCustomerModal } from '../components/customers/EditCustomerModal';
import { PhoneNumber } from '../components/ui/PhoneNumber';
import { useSupabase } from '../hooks/useSupabase';
import { ScheduleServiceModal } from '../components/services/ScheduleServiceModal';

interface CustomerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  company_name: string | null;
  referral_source: string | null;
  total_spent: number;
  created_at: string;
  properties: Array<{
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    zip_code: string;
    property_size: number | null;
    lawn_size: number | null;
    has_irrigation: boolean;
    has_pets: boolean;
  }>;
  recent_services: Array<{
    id: string;
    scheduled_date: string;
    service_type: {
      label: string;
    };
    base_price: number;
  }>;
  next_service?: {
    scheduled_date: string;
    scheduled_time_window: string;
  };
}

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

export const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isQuickScheduleOpen, setIsQuickScheduleOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { supabase } = useSupabase();

  const fetchCustomerDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      // First get customer and properties
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          *,
          properties (
            id,
            address_line1,
            address_line2,
            city,
            state,
            zip_code,
            property_size,
            lawn_size,
            has_irrigation,
            has_pets
          )
        `)
        .eq('id', id)
        .single();

      if (customerError) throw customerError;

      // Then get services for all properties of this customer
      const { data: servicesData, error: servicesError } = await supabase
        .from('service_schedules')
        .select(`
          id,
          scheduled_date,
          service_type:service_types (
            label
          ),
          base_price,
          property:properties!inner (
            id,
            customer_id
          )
        `)
        .eq('property.customer_id', id)
        .order('scheduled_date', { ascending: false });

      if (servicesError) throw servicesError;

      // Get next service
      const { data: nextService } = await supabase
        .from('service_schedules')
        .select('scheduled_date, scheduled_time_window')
        .eq('property.customer_id', id)
        .gt('scheduled_date', new Date().toISOString())
        .order('scheduled_date')
        .limit(1)
        .single();

      setCustomer({
        ...customerData,
        recent_services: servicesData?.slice(0, 5) || [],
        next_service: nextService || undefined
      });
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError(err as Error);
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleQuickAction = (action: string) => {
    toast.success(`${action} for ${customer?.first_name} ${customer?.last_name}`);
  };

  const handleEditSave = async (data: any) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          billing_address: data.billing_address,
          billing_city: data.billing_city,
          billing_state: data.billing_state,
          billing_zip: data.billing_zip,
          company_name: data.company_name || null,
          referral_source: data.referral_source || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await fetchCustomerDetails();
      setIsEditModalOpen(false);
      toast.success('Customer details updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update customer: ${errorMessage}`);
    }
  };

  const QuickActionButton = ({ icon, label, onClick, color = 'primary' }: any) => (
    <motion.button
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className={`flex items-center rounded-lg bg-${color}-100 px-4 py-2 text-sm font-medium text-${color}-700 hover:bg-${color}-200 dark:bg-${color}-900/20 dark:text-${color}-400 dark:hover:bg-${color}-900/30`}
    >
      <Icon icon={icon} className="mr-2" />
      {label}
    </motion.button>
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p className="text-yellow-800 dark:text-yellow-400">Customer not found</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/customers')}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Icon icon={ArrowLeftIcon} />
            </motion.button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Customer Details
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <QuickActionButton
              icon={ChatBubbleLeftIcon}
              label="Message"
              onClick={() => handleQuickAction('Message sent')}
            />
            <QuickActionButton
              icon={PencilIcon}
              label="Edit"
              onClick={() => setIsEditModalOpen(true)}
            />
            <QuickActionButton
              icon={TrashIcon}
              label="Delete"
              color="red"
              onClick={() => handleQuickAction('Delete initiated')}
            />
          </div>
        </div>

        {/* Customer Info Card with Quick Schedule */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-medium text-primary-700 dark:bg-primary-900/50 dark:text-primary-400"
              >
                {customer.first_name[0]}{customer.last_name[0]}
              </motion.div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {customer.first_name} {customer.last_name}
                </h2>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Icon icon={CalendarIcon} className="mr-1.5" size="sm" />
                    Customer since {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Icon icon={CurrencyDollarIcon} className="mr-1.5" size="sm" />
                    Total spent: ${(customer.total_spent || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsQuickScheduleOpen(true)}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Schedule Service
            </motion.button>
          </div>

          <div className="mt-6 grid gap-4 border-t border-gray-200 pt-6 dark:border-gray-700 sm:grid-cols-2">
            <div className="flex items-center">
              <Icon icon={EnvelopeIcon} className="mr-3 text-gray-400" />
              <span className="text-gray-900 dark:text-white">{customer.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <PhoneIcon className="h-5 w-5 text-gray-400" />
              <a href={`tel:${customer.phone}`} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                <PhoneNumber number={customer.phone} />
              </a>
            </div>
            <div className="flex items-center sm:col-span-2">
              <Icon icon={MapPinIcon} className="mr-3 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                {customer.billing_address}, {customer.billing_city}, {customer.billing_state} {customer.billing_zip}
              </span>
            </div>
          </div>

          {/* Next Service Info */}
          {customer.next_service && (
            <div className="mt-6 rounded-lg bg-primary-50 p-4 dark:bg-primary-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-primary-100 p-2 dark:bg-primary-900/30">
                    <Icon icon={ClockIcon} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100">
                      Next Service
                    </h3>
                    <p className="text-sm text-primary-700 dark:text-primary-300">
                      {new Date(customer.next_service.scheduled_date).toLocaleDateString()} • {customer.next_service.scheduled_time_window}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAction('Reminder sent')}
                  className="rounded-lg bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/40"
                >
                  Send Reminder
                </motion.button>
              </div>
            </div>
          )}

          {/* Customer Notes */}
          {customer.referral_source && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Referral Source</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{customer.referral_source}</p>
            </div>
          )}
        </div>

        {/* Properties */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
              <Icon icon={BuildingOfficeIcon} className="mr-2" />
              Properties
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction('Add property initiated')}
              className="rounded-lg text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Add Property
            </motion.button>
          </div>
          <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">
            {customer.properties.map((property) => (
              <motion.div
                key={property.id}
                whileHover={{ x: 10 }}
                className="cursor-pointer py-4"
                onClick={() => handleQuickAction(`Viewing property at ${property.address_line1} ${property.address_line2 ? `, ${property.address_line2}` : ''}`)}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {property.address_line1}
                  {property.address_line2 && `, ${property.address_line2}`}, {property.city}, {property.state} {property.zip_code}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {property.property_size ? `${property.property_size.toLocaleString()} sq ft` : 'Size not specified'} • 
                  {property.lawn_size ? ` Lawn: ${property.lawn_size.toLocaleString()} sq ft` : ' Lawn size not specified'}
                  {property.has_irrigation && ' • Has Irrigation'}
                  {property.has_pets && ' • Has Pets'}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Services */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
              <Icon icon={CalendarIcon} className="mr-2" />
              Recent Services
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction('Viewing full service history')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              View All
            </motion.button>
          </div>
          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Service
                  </th>
                  <th className="py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {customer.recent_services.map((service) => (
                  <motion.tr
                    key={service.id}
                    whileHover={{ backgroundColor: 'rgba(var(--color-primary-50), 0.5)' }}
                    className="cursor-pointer"
                    onClick={() => handleQuickAction(`Viewing service details from ${service.scheduled_date}`)}
                  >
                    <td className="py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(service.scheduled_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-sm text-gray-900 dark:text-white">
                      {service.service_type.label}
                    </td>
                    <td className="py-4 text-right text-sm text-gray-900 dark:text-white">
                      ${(service.base_price || 0).toFixed(2)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={{
          name: `${customer?.first_name} ${customer?.last_name}`,
          email: customer?.email || '',
          phone: customer?.phone || '',
          address: `${customer?.billing_address}, ${customer?.billing_city}, ${customer?.billing_state} ${customer?.billing_zip}`,
          preferredTime: customer?.next_service?.scheduled_time_window || 'morning',
          notes: customer?.referral_source || ''
        }}
        onUpdate={handleEditSave}
      />

      {/* Schedule Service Modal */}
      <ScheduleServiceModal
        isOpen={isQuickScheduleOpen}
        onClose={() => setIsQuickScheduleOpen(false)}
        onSchedule={async (service) => {
          await fetchCustomerDetails();
          setIsQuickScheduleOpen(false);
          toast.success('Service scheduled successfully!');
        }}
        preSelectedCustomerId={id}
      />
    </>
  );
}; 