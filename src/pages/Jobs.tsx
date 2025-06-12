import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AddJobModal } from '../components/jobs/AddJobModal';

export const Jobs = () => {
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Jobs
        </h1>
        <button
          onClick={() => setIsAddJobModalOpen(true)}
          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Job
        </button>
      </div>

      <AddJobModal
        isOpen={isAddJobModalOpen}
        onClose={() => setIsAddJobModalOpen(false)}
      />
    </div>
  );
}; 