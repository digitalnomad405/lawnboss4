import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MapPinIcon,
  UserIcon,
  ChevronRightIcon,
  Square2StackIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  HomeIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { PropertyDetailsModal } from '../components/properties/PropertyDetailsModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { logger } from '../utils/logger';
import { devTools } from '../utils/devTools';
import { useDevMonitor } from '../hooks/useDevMonitor';
import { AddPropertyModal } from '../components/properties/AddPropertyModal';
import toast from 'react-hot-toast';
import { useSupabase } from '../hooks/useSupabase';

const propertyTypes = {
  residential: { icon: HomeIcon, label: 'Residential' },
  commercial: { icon: BuildingOffice2Icon, label: 'Commercial' },
  retail: { icon: BuildingStorefrontIcon, label: 'Retail' }
};

type SortField = 'address' | 'city' | 'customer' | 'size' | 'created_at';
type SortOrder = 'asc' | 'desc';
type PropertyType = keyof typeof propertyTypes;

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

const statusColors = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  Paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  Inactive: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

const StatCard = ({ title, value, icon, color = 'primary' }: {
  title: string;
  value: string | number;
  icon: any;
  color?: 'primary' | 'blue' | 'green' | 'purple';
}) => (
  <div className={`rounded-lg bg-${color}-50 p-6 dark:bg-${color}-900/20`}>
    <div className="flex items-center">
      <div className={`rounded-lg bg-${color}-100 p-3 dark:bg-${color}-900/50`}>
        <Icon
          icon={icon}
          className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`}
        />
      </div>
      <div className="ml-4">
        <h3 className={`text-sm font-medium text-${color}-900 dark:text-${color}-100`}>{title}</h3>
        <p className={`mt-1 text-2xl font-semibold text-${color}-700 dark:text-${color}-300`}>{value}</p>
      </div>
    </div>
  </div>
);

const PropertiesList = () => {
  useDevMonitor('PropertiesList');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PropertyType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('address');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { properties, customers, loading, error, addProperty } = useSupabase();

  const handleSearch = (value: string) => {
    devTools.performance.start('Property search');
    setSearchQuery(value);
    devTools.performance.end('Property search');
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handlePropertySelect = (property: Property) => {
    devTools.performance.start('Property select');
    setSelectedProperty(property);
    devTools.info(`Selected property: ${property.address_line1}`);
    devTools.performance.end('Property select');
  };

  const handleAddProperty = async (propertyData: {
    customer_id: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    zip_code: string;
    property_size: number | null;
    lawn_size: number | null;
    has_irrigation: boolean;
    has_pets: boolean;
  }) => {
    try {
      await addProperty(propertyData);
    } catch (error) {
      console.error('Error adding property:', error);
      devTools.error(error as Error, 'Failed to add property');
      toast.error('Failed to add property. Please try again.');
      throw error;
    }
  };

  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const totalArea = properties.reduce((sum, p) => sum + (p.property_size || 0), 0);
    const totalLawnArea = properties.reduce((sum, p) => sum + (p.lawn_size || 0), 0);
    const withIrrigation = properties.filter(p => p.has_irrigation).length;

    return {
      totalProperties,
      totalArea: Math.round(totalArea).toLocaleString(),
      totalLawnArea: Math.round(totalLawnArea).toLocaleString(),
      withIrrigation
    };
  }, [properties]);

  const filteredAndSortedProperties = useMemo(() => {
    return properties
      .filter(property => {
        const customer = customers.find(c => c.id === property.customer_id);
        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : '';
        
        const matchesSearch = 
          property.address_line1.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.address_line2?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.zip_code.includes(searchQuery);

        const matchesType = selectedType === 'all' || property.type === selectedType;
        
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const customer1 = customers.find(c => c.id === a.customer_id);
        const customer2 = customers.find(c => c.id === b.customer_id);
        const name1 = customer1 ? `${customer1.first_name} ${customer1.last_name}` : '';
        const name2 = customer2 ? `${customer2.first_name} ${customer2.last_name}` : '';

        let comparison = 0;
        switch (sortField) {
          case 'address':
            comparison = a.address_line1.localeCompare(b.address_line1);
            break;
          case 'city':
            comparison = a.city.localeCompare(b.city);
            break;
          case 'customer':
            comparison = name1.localeCompare(name2);
            break;
          case 'size':
            comparison = (a.property_size || 0) - (b.property_size || 0);
            break;
          case 'created_at':
            comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [properties, customers, searchQuery, selectedType, sortField, sortOrder]);

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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Properties
          </h1>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Property
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Properties"
            value={stats.totalProperties}
            icon={BuildingOfficeIcon}
          />
          <StatCard
            title="Total Area"
            value={`${stats.totalArea} sq ft`}
            icon={Square2StackIcon}
            color="blue"
          />
          <StatCard
            title="Total Lawn Area"
            value={`${stats.totalLawnArea} sq ft`}
            icon={Square2StackIcon}
            color="green"
          />
          <StatCard
            title="With Irrigation"
            value={stats.withIrrigation}
            icon={BuildingOfficeIcon}
            color="purple"
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
              placeholder="Search properties or customers..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as PropertyType | 'all')}
              className="rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              {Object.entries(propertyTypes).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <button
              onClick={() => handleSort('address')}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowsUpDownIcon className="-ml-1 mr-2 h-5 w-5" />
              Sort
            </button>
          </div>
        </div>

        {/* Properties list */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
          {filteredAndSortedProperties.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center p-6">
              <p className="text-gray-500 dark:text-gray-400">
                No properties found matching your criteria.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedProperties.map((property, index) => {
                const customer = customers.find(c => c.id === property.customer_id);
                const PropertyTypeIcon = property.type ? propertyTypes[property.type as PropertyType]?.icon : HomeIcon;
                
                return (
                  <motion.li
                    key={property.id}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    whileTap="tap"
                    custom={index}
                    onClick={() => handlePropertySelect(property)}
                    className="group cursor-pointer p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                              <Icon icon={PropertyTypeIcon} />
                            </div>
                            <div>
                              <h2 className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
                                {property.address_line1}
                                {property.address_line2 && `, ${property.address_line2}`}
                                <Icon
                                  icon={ChevronRightIcon}
                                  className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                                />
                              </h2>
                              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center">
                                  <Icon icon={MapPinIcon} className="mr-1.5 text-gray-400" size="sm" />
                                  {property.city}, {property.state} {property.zip_code}
                                </div>
                                <div className="flex items-center">
                                  <Icon icon={UserIcon} className="mr-1.5 text-gray-400" size="sm" />
                                  {customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Icon icon={Square2StackIcon} className="mr-1.5 text-gray-400" size="sm" />
                            {property.property_size ? `${property.property_size.toLocaleString()} sq ft` : 'Size not specified'}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Icon icon={Square2StackIcon} className="mr-1.5 text-gray-400" size="sm" />
                            {property.lawn_size ? `Lawn: ${property.lawn_size.toLocaleString()} sq ft` : 'Lawn size not specified'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {property.has_irrigation && (
                              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                Irrigation System
                              </span>
                            )}
                            {property.has_pets && (
                              <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                Has Pets
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetailsModal
          isOpen={selectedProperty !== null}
          onClose={() => {
            setSelectedProperty(null);
            devTools.info('Property modal closed');
          }}
          property={selectedProperty}
        />
      )}

      {/* Add Property Modal */}
      <AddPropertyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProperty}
        customers={customers}
      />
    </>
  );
};

export const Properties = () => {
  return (
    <ErrorBoundary>
      <PropertiesList />
    </ErrorBoundary>
  );
}; 