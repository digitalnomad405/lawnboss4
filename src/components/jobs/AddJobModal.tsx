import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const slideIn = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { x: '100%', transition: { type: 'spring', damping: 30, stiffness: 300 } },
};

export const AddJobModal = ({ isOpen, onClose }: AddJobModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
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
              <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                  <motion.div
                    className="pointer-events-auto w-screen max-w-md"
                    variants={slideIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <Dialog.Panel className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl dark:bg-gray-800">
                      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-800">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                          Add New Job
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                          onClick={onClose}
                        >
                          <Icon icon={XMarkIcon} />
                        </button>
                      </div>

                      <div className="flex-1 px-4 py-6">
                        <form className="space-y-6">
                          <div>
                            <label
                              htmlFor="customer"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Customer
                            </label>
                            <input
                              type="text"
                              name="customer"
                              id="customer"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="service"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Service
                            </label>
                            <select
                              id="service"
                              name="service"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                            >
                              <option>Lawn Mowing</option>
                              <option>Garden Maintenance</option>
                              <option>Tree Trimming</option>
                              <option>Landscaping</option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor="date"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Date
                            </label>
                            <input
                              type="date"
                              name="date"
                              id="date"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="amount"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Amount
                            </label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                                  $
                                </span>
                              </div>
                              <input
                                type="text"
                                name="amount"
                                id="amount"
                                className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div className="mt-6 flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={onClose}
                              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                            >
                              Add Job
                            </button>
                          </div>
                        </form>
                      </div>
                    </Dialog.Panel>
                  </motion.div>
                </div>
              </div>
            </div>
          </Dialog>
        </Transition.Root>
      )}
    </AnimatePresence>
  );
}; 