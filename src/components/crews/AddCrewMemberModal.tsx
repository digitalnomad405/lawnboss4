import { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Crew, CrewRole } from '../../types/crew';
import { FormField } from '../ui/FormField';
import { useSupabase } from '../../hooks/useSupabase';

interface AddCrewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (memberData: {
    technician_id: string;
    role: CrewRole;
    is_primary_crew: boolean;
  }) => Promise<void>;
  crew: Crew | null;
}

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export const AddCrewMemberModal = ({ isOpen, onClose, onAdd, crew }: AddCrewMemberModalProps) => {
  const [formData, setFormData] = useState({
    technician_id: '',
    role: 'crew_member' as CrewRole,
    is_primary_crew: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        console.log('Fetching technicians...');
        const { data, error } = await supabase
          .from('technicians')
          .select('id, first_name, last_name, email, phone')
          .eq('status', 'active')
          .order('first_name', { ascending: true });

        if (error) throw error;
        console.log('Fetched technicians:', data);
        setTechnicians(data || []);
      } catch (err) {
        console.error('Error fetching technicians:', err);
      }
    };

    if (isOpen) {
      fetchTechnicians();
    }
  }, [isOpen, supabase]);

  const handleInputChange = (name: keyof typeof formData, value: any) => {
    console.log('Input changed:', name, value);
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.technician_id) {
      newErrors.technician_id = 'Please select a technician';
    }
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    console.log('Form validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    console.log('Form submitted with data:', formData);
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(formData);
      setFormData({
        technician_id: '',
        role: 'crew_member',
        is_primary_crew: false
      });
    } catch (err) {
      console.error('Error submitting form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!crew) return null;

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
                      Add Member to {crew.name}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                      <FormField
                        label="Technician"
                        name="technician_id"
                        value={formData.technician_id}
                        onValueChange={(name, value) => handleInputChange(name as keyof typeof formData, value)}
                        error={errors.technician_id}
                        as="select"
                        options={[
                          { value: '', label: 'Select a technician' },
                          ...technicians.map(tech => ({
                            value: tech.id,
                            label: `${tech.first_name} ${tech.last_name}`
                          }))
                        ]}
                        required
                      />

                      <FormField
                        label="Role"
                        name="role"
                        value={formData.role}
                        onValueChange={(name, value) => handleInputChange(name as keyof typeof formData, value)}
                        error={errors.role}
                        as="select"
                        options={[
                          { value: 'crew_leader', label: 'Crew Leader' },
                          { value: 'crew_member', label: 'Crew Member' },
                          { value: 'trainee', label: 'Trainee' }
                        ]}
                        required
                      />

                      <FormField
                        label="Primary Crew"
                        name="is_primary_crew"
                        value={formData.is_primary_crew}
                        onValueChange={(name, value) => handleInputChange(name as keyof typeof formData, value)}
                        error={errors.is_primary_crew}
                        as="checkbox"
                        description="Set this as the technician's primary crew"
                      />

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
                        >
                          {isSubmitting ? 'Adding...' : 'Add Member'}
                        </button>
                      </div>
                    </form>
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