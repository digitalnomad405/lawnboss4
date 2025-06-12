import { useState, useEffect } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { AddTechnicianModal } from '../components/technicians/AddTechnicianModal';

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const TechniciansList = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (err) {
      console.error('Error fetching technicians:', err);
      toast.error('Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  const filteredTechnicians = technicians.filter((tech) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tech.first_name.toLowerCase().includes(searchLower) ||
      tech.last_name.toLowerCase().includes(searchLower) ||
      tech.email.toLowerCase().includes(searchLower) ||
      tech.phone.includes(searchLower)
    );
  });

  const getStatusColor = (status: Technician['status']) => {
    return status === 'active' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Technicians
        </h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Technician
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
            placeholder="Search technicians by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Technicians List */}
      <div className="min-h-[400px] rounded-lg bg-white shadow-sm dark:bg-gray-800">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading technicians...</p>
            </div>
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              No technicians found matching your search.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTechnicians.map((technician) => (
              <motion.li
                key={technician.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="cursor-pointer p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20">
                    <UserIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {technician.first_name} {technician.last_name}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(technician.status)}`}>
                        {technician.status.charAt(0).toUpperCase() + technician.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0">
                      <a
                        href={`mailto:${technician.email}`}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <EnvelopeIcon className="mr-1.5 h-4 w-4" />
                        {technician.email}
                      </a>
                      <a
                        href={`tel:${technician.phone}`}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <PhoneIcon className="mr-1.5 h-4 w-4" />
                        {technician.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <AddTechnicianModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={fetchTechnicians}
      />
    </div>
  );
};

export default TechniciansList; 