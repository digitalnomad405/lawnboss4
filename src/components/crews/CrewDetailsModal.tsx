import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import type { Crew, CrewMember } from '../../types/crew';

interface CrewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  crew: Crew;
  members: CrewMember[];
  onAddMember: () => void;
}

export const CrewDetailsModal = ({ isOpen, onClose, crew, members, onAddMember }: CrewDetailsModalProps) => {
  const getRoleColor = (role: CrewMember['role']) => {
    switch (role) {
      case 'crew_leader':
        return 'text-blue-600 dark:text-blue-400';
      case 'crew_member':
        return 'text-green-600 dark:text-green-400';
      case 'trainee':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75" />
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      {crew.name}
                    </Dialog.Title>

                    {crew.description && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {crew.description}
                      </p>
                    )}

                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Crew Members
                        </h4>
                        <button
                          onClick={onAddMember}
                          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
                          Add Member
                        </button>
                      </div>
                      <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">
                        {members.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No members in this crew
                          </p>
                        ) : (
                          members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between py-4"
                            >
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {member.technician?.first_name} {member.technician?.last_name}
                                </h5>
                                <div className="mt-1 flex items-center space-x-4 text-sm">
                                  <span className={`${getRoleColor(member.role)}`}>
                                    {member.role.split('_').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </span>
                                  {member.is_primary_crew && (
                                    <span className="text-primary-600 dark:text-primary-400">
                                      Primary Crew
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  Joined {formatDate(member.start_date)}
                                </p>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {member.technician?.email}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        Close
                      </button>
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