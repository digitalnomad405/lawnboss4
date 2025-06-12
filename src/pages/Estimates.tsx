import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSupabase } from '../hooks/useSupabase';
import { type FC, type ComponentProps } from 'react';

type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

interface Estimate {
  id: string;
  customer_id: string;
  property_id: string;
  title: string;
  status: EstimateStatus;
  total_amount: number;
  created_at: string;
  valid_until: string;
  notes?: string;
}

const statusColors: Record<EstimateStatus, string> = {
  draft: 'gray',
  sent: 'blue',
  accepted: 'green',
  declined: 'red',
  expired: 'yellow',
};

const statusIcons: Record<EstimateStatus, FC<ComponentProps<'svg'>>> = {
  draft: DocumentTextIcon,
  sent: DocumentArrowUpIcon,
  accepted: CheckCircleIcon,
  declined: XCircleIcon,
  expired: ClockIcon,
};

const StatCard = ({ title, value, icon: IconComponent, color = 'primary' }: {
  title: string;
  value: string | number;
  icon: FC<ComponentProps<'svg'>>;
  color?: 'primary' | 'blue' | 'green' | 'purple' | 'yellow' | 'red';
}) => (
  <div className={`rounded-lg bg-${color}-50 p-6 dark:bg-${color}-900/20`}>
    <div className="flex items-center">
      <div className={`rounded-lg bg-${color}-100 p-3 dark:bg-${color}-900/50`}>
        <IconComponent className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} aria-hidden="true" />
      </div>
      <div className="ml-4">
        <h3 className={`text-sm font-medium text-${color}-900 dark:text-${color}-100`}>{title}</h3>
        <p className={`mt-1 text-2xl font-semibold text-${color}-700 dark:text-${color}-300`}>{value}</p>
      </div>
    </div>
  </div>
);

const EstimatesList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<EstimateStatus | 'all'>('all');
  const { supabase, customers, properties } = useSupabase();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEstimates();
  }, []);

  const loadEstimates = async () => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstimates(data || []);
    } catch (error) {
      console.error('Error loading estimates:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalEstimates = estimates.length;
    const totalPending = estimates.filter(e => e.status === 'sent').length;
    const totalAccepted = estimates.filter(e => e.status === 'accepted').length;
    const totalValue = estimates.reduce((sum, e) => sum + (e.total_amount || 0), 0);

    return {
      totalEstimates,
      totalPending,
      totalAccepted,
      totalValue: totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    };
  }, [estimates]);

  const filteredEstimates = useMemo(() => {
    return estimates.filter(estimate => {
      const customer = customers.find(c => c.id === estimate.customer_id);
      const property = properties.find(p => p.id === estimate.property_id);
      const customerName = customer ? `${customer.first_name} ${customer.last_name}` : '';
      const propertyAddress = property ? property.address_line1 : '';

      const matchesSearch = 
        estimate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'all' || estimate.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [estimates, customers, properties, searchQuery, selectedStatus]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Estimates
        </h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/estimates/new')}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Create Estimate
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Estimates"
          value={stats.totalEstimates}
          icon={DocumentTextIcon}
        />
        <StatCard
          title="Pending Approval"
          value={stats.totalPending}
          icon={ClockIcon}
          color="yellow"
        />
        <StatCard
          title="Accepted"
          value={stats.totalAccepted}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="Total Value"
          value={stats.totalValue}
          icon={CurrencyDollarIcon}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search estimates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as EstimateStatus | 'all')}
          className="rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Estimates list */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading estimates...</p>
            </div>
          </div>
        ) : filteredEstimates.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
            <div className="rounded-full bg-primary-100 p-3 dark:bg-primary-900/20">
              <DocumentTextIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No estimates found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first estimate
            </p>
            <button
              onClick={() => navigate('/estimates/new')}
              className="mt-4 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Estimate
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEstimates.map((estimate) => {
              const customer = customers.find(c => c.id === estimate.customer_id);
              const property = properties.find(p => p.id === estimate.property_id);
              const StatusIcon = statusIcons[estimate.status] || DocumentTextIcon;
              
              return (
                <motion.li
                  key={estimate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/estimates/${estimate.id}`)}
                  className="group cursor-pointer p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${statusColors[estimate.status]}-100 text-${statusColors[estimate.status]}-700 dark:bg-${statusColors[estimate.status]}-900/20 dark:text-${statusColors[estimate.status]}-400`}>
                            <StatusIcon className="h-6 w-6" aria-hidden="true" />
                          </div>
                          <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                              {estimate.title}
                            </h2>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <UserIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                                {customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer'}
                              </div>
                              <div className="flex items-center">
                                <CalendarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                                {new Date(estimate.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-${statusColors[estimate.status]}-100 text-${statusColors[estimate.status]}-800 dark:bg-${statusColors[estimate.status]}-900/20 dark:text-${statusColors[estimate.status]}-400`}>
                            {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                          </div>
                          <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
                            {estimate.total_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </p>
                        </div>
                      </div>

                      {property && (
                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                          Property: {property.address_line1}
                          {property.address_line2 && `, ${property.address_line2}`}
                          , {property.city}, {property.state} {property.zip_code}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export const Estimates = () => {
  return (
    <ErrorBoundary>
      <EstimatesList />
    </ErrorBoundary>
  );
}; 