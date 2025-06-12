import { useState } from 'react';
import { useCrews } from '../hooks/useCrews';
import type { Crew, CrewMember } from '../types/crew';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { AddCrewModal } from '../components/crews/AddCrewModal';
import { AddCrewMemberModal } from '../components/crews/AddCrewMemberModal';
import { CrewDetailsModal } from '../components/crews/CrewDetailsModal';

const Crews = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isAddCrewModalOpen, setIsAddCrewModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedCrewForMember, setSelectedCrewForMember] = useState<Crew | null>(null);
  
  const {
    crews,
    crewMembers,
    loading,
    error,
    addCrew,
    addCrewMember,
    updateCrewStatus
  } = useCrews();

  const handleAddCrew = async (crewData: Pick<Crew, 'name' | 'description'>) => {
    try {
      await addCrew(crewData);
      toast.success('Crew added successfully!');
      setIsAddCrewModalOpen(false);
    } catch (err) {
      console.error('Error in handleAddCrew:', err);
      toast.error('Failed to add crew');
    }
  };

  const handleAddCrewMember = async (memberData: {
    technician_id: string;
    role: CrewMember['role'];
    is_primary_crew: boolean;
  }) => {
    if (!selectedCrewForMember) return;

    try {
      await addCrewMember({
        ...memberData,
        crew_id: selectedCrewForMember.id
      });
      toast.success('Crew member added successfully!');
      setIsAddMemberModalOpen(false);
      setSelectedCrewForMember(null);
    } catch (err) {
      console.error('Error in handleAddCrewMember:', err);
      toast.error('Failed to add crew member');
    }
  };

  const handleStatusChange = async (crew: Crew) => {
    try {
      const newStatus = crew.status === 'active' ? 'inactive' : 'active';
      await updateCrewStatus(crew.id, newStatus);
      toast.success(`Crew ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      console.error('Error updating crew status:', err);
      toast.error('Failed to update crew status');
    }
  };

  const handleOpenAddMember = (crew: Crew) => {
    setSelectedCrewForMember(crew);
    setIsAddMemberModalOpen(true);
  };

  const filteredCrews = crews.filter(crew => {
    const searchLower = searchQuery.toLowerCase();
    return crew.name.toLowerCase().includes(searchLower) ||
           crew.description?.toLowerCase().includes(searchLower);
  });

  const getCrewMembers = (crewId: string) => {
    return crewMembers.filter(member => member.crew_id === crewId);
  };

  if (error) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 mt-8">
        Error loading crews: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Crews
        </h1>
        <button
          onClick={() => setIsAddCrewModalOpen(true)}
          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Crew
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search crews..."
          className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
        />
      </div>

      {/* Crews List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center">Loading crews...</div>
        ) : filteredCrews.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 dark:text-gray-400">
            No crews found
          </div>
        ) : (
          filteredCrews.map((crew) => (
            <motion.div
              key={crew.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {crew.name}
                </h3>
                <button
                  onClick={() => handleStatusChange(crew)}
                  className={`rounded-full ${
                    crew.status === 'active'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {crew.status === 'active' ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <XCircleIcon className="h-6 w-6" />
                  )}
                </button>
              </div>

              {crew.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {crew.description}
                </p>
              )}

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Members ({getCrewMembers(crew.id).length})
                </h4>
                <div className="mt-2 flex -space-x-2 overflow-hidden">
                  {getCrewMembers(crew.id).map((member) => (
                    <div
                      key={member.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white dark:bg-gray-700 dark:ring-gray-800"
                    >
                      <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  ))}
                  <button
                    onClick={() => handleOpenAddMember(crew)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white hover:bg-gray-200 dark:bg-gray-700 dark:ring-gray-800 dark:hover:bg-gray-600"
                  >
                    <PlusIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedCrew(crew)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modals */}
      <AddCrewModal
        isOpen={isAddCrewModalOpen}
        onClose={() => setIsAddCrewModalOpen(false)}
        onAdd={handleAddCrew}
      />

      <AddCrewMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setSelectedCrewForMember(null);
        }}
        onAdd={handleAddCrewMember}
        crew={selectedCrewForMember}
      />

      {selectedCrew && (
        <CrewDetailsModal
          isOpen={selectedCrew !== null}
          onClose={() => setSelectedCrew(null)}
          crew={selectedCrew}
          members={getCrewMembers(selectedCrew.id)}
          onAddMember={() => handleOpenAddMember(selectedCrew)}
        />
      )}
    </div>
  );
};

export default Crews; 