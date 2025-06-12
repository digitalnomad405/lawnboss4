import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  UsersIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { AddCustomerModal } from '../components/customers/AddCustomerModal';
import toast from 'react-hot-toast';
import { useSupabase } from '../hooks/useSupabase';
import { PhoneNumber } from '../components/ui/PhoneNumber';

type SortField = 'name' | 'total_spent' | 'properties' | 'last_service';
type SortOrder = 'asc' | 'desc';

const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.3,
    },
  }),
  hover: {
    scale: 1.01,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.99,
  },
};

const StatCard = ({ title, value, icon, trend, trendValue }: {
  title: string;
  value: string;
  icon: any;
  trend?: 'up' | 'down';
  trendValue?: string;
}) => (
  <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900/50">
          <Icon
            icon={icon}
            className="h-6 w-6 text-primary-600 dark:text-primary-400"
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
      {trend && trendValue && (
        <div className={`flex items-center space-x-1 text-sm font-medium ${
          trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          <Icon
            icon={trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
            className="h-4 w-4"
          />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  </div>
);

export const Customers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { customers: customersList, loading, error, addCustomer, addProperty } = useSupabase();
  const navigate = useNavigate();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAddCustomer = async (customerData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    billing_address: string;
    billing_city: string;
    billing_state: string;
    billing_zip: string;
    referral_source: string;
  }) => {
    try {
      const customerId = await addCustomer(customerData);
      if (!customerId) {
        throw new Error('No customer ID returned');
      }
      return customerId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error in handleAddCustomer:', errorMessage);
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  const metrics = useMemo(() => {
    if (!customersList?.length) return {
      totalCustomers: 0,
      totalRevenue: 0,
      totalProperties: 0,
      avgRevenuePerCustomer: 0,
      activeCustomers: 0,
      customerGrowth: 0,
    };

    const totalCustomers = customersList.length;
    const totalRevenue = customersList.reduce((sum, customer) => sum + (customer.total_spent || 0), 0);
    const totalProperties = customersList.length; // Each customer has one property initially
    const avgRevenuePerCustomer = totalCustomers ? totalRevenue / totalCustomers : 0;
    
    // Get customers with service in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeCustomers = customersList.filter(
      customer => customer.status === 'active'
    ).length;

    // Calculate customer growth (simplified for now)
    const customerGrowth = 0; // We'll need to track this over time

    return {
      totalCustomers,
      totalRevenue,
      totalProperties,
      avgRevenuePerCustomer,
      activeCustomers,
      customerGrowth,
    };
  }, [customersList]);

  const sortedAndFilteredCustomers = useMemo(() => {
    if (!customersList) return [];

    return customersList
      .filter((customer) => {
        const searchTerms = searchQuery.toLowerCase();
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        
        return fullName.includes(searchTerms) ||
          (customer.email || '').toLowerCase().includes(searchTerms) ||
          (customer.phone || '').includes(searchTerms) ||
          (customer.billing_address || '').toLowerCase().includes(searchTerms) ||
          (customer.billing_city || '').toLowerCase().includes(searchTerms) ||
          (customer.billing_state || '').toLowerCase().includes(searchTerms) ||
          (customer.billing_zip || '').includes(searchTerms);
      })
      .sort((a, b) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1;
        switch (sortField) {
          case 'name':
            return multiplier * `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          case 'total_spent':
            return multiplier * ((a.total_spent || 0) - (b.total_spent || 0));
          case 'properties':
            return 0; // Each customer has one property initially
          case 'last_service':
            if (!a.last_service || !b.last_service) return 0;
            return multiplier * (new Date(a.last_service).getTime() - new Date(b.last_service).getTime());
          default:
            return 0;
        }
      });
  }, [customersList, searchQuery, sortField, sortOrder]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center space-x-1 text-sm font-medium ${
        sortField === field
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      <span>{label}</span>
      <Icon
        icon={ChevronUpDownIcon}
        size="sm"
        className={`transition-transform ${
          sortField === field ? 'text-primary-600 dark:text-primary-400' : ''
        }`}
      />
    </button>
  );

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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Customers
        </h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Customer
        </button>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={metrics.totalCustomers.toString()}
          icon={UsersIcon}
          trend="up"
          trendValue={`${metrics.customerGrowth > 0 ? '+' : ''}${metrics.customerGrowth.toFixed(1)}% this month`}
        />
        <StatCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          icon={CurrencyDollarIcon}
          trend="up"
          trendValue="+8% this month"
        />
        <StatCard
          title="Properties Managed"
          value={metrics.totalProperties.toString()}
          icon={BuildingOfficeIcon}
          trend="up"
          trendValue="+5 this month"
        />
        <StatCard
          title="Active Customers"
          value={`${metrics.activeCustomers} (${Math.round(metrics.activeCustomers / metrics.totalCustomers * 100)}%)`}
          icon={CalendarIcon}
          trend={metrics.activeCustomers > metrics.totalCustomers / 2 ? 'up' : 'down'}
          trendValue={`${Math.round(metrics.activeCustomers / metrics.totalCustomers * 100)}% active`}
        />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="relative flex-1 max-w-lg">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search customers by name, email, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div className="flex items-center space-x-4">
          <SortButton field="name" label="Name" />
          <SortButton field="total_spent" label="Total Spent" />
          <SortButton field="properties" label="Properties" />
          <SortButton field="last_service" label="Last Service" />
        </div>
      </div>

      {/* Customer list */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedAndFilteredCustomers.map((customer, index) => (
            <motion.li
              key={customer.id}
              variants={listItemVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              whileTap="tap"
              custom={index}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="group cursor-pointer px-6 py-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-medium text-primary-700 dark:bg-primary-900/50 dark:text-primary-400">
                    {customer.first_name[0]}{customer.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="flex items-center text-base font-medium text-gray-900 dark:text-white">
                      {customer.first_name} {customer.last_name}
                      <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        customer.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {customer.status}
                      </span>
                      <Icon
                        icon={ChevronRightIcon}
                        className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Icon icon={EnvelopeIcon} className="mr-1.5 text-gray-400" size="sm" />
                        {customer.email}
                      </div>
                      <div className="flex items-center">
                        <Icon icon={PhoneIcon} className="mr-1.5 text-gray-400" size="sm" />
                        <PhoneNumber number={customer.phone} />
                      </div>
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Icon icon={MapPinIcon} className="mr-1.5 text-gray-400" size="sm" />
                      {customer.billing_address}, {customer.billing_city}, {customer.billing_state} {customer.billing_zip}
                    </div>
                  </div>
                </div>
                <div className="ml-6 flex flex-col items-end">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${(customer.total_spent || 0).toLocaleString()}
                  </p>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.payment_terms} day terms
                    </span>
                  </div>
                  {customer.last_service && (
                    <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Icon icon={CalendarIcon} className="mr-1 h-4 w-4" />
                      Last service: {new Date(customer.last_service).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCustomer}
        addProperty={addProperty}
      />
    </div>
  );
}; 