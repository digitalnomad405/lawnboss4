import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';
import { FormField } from '../ui/FormField';
import { toast } from 'react-hot-toast';
import { useSupabase } from '../../hooks/useSupabase';

interface ServiceFormData {
  property_id: string;
  service_type_id: string;
  assigned_technician_id: string;
  scheduled_date: string;
  scheduled_time_window: 'morning' | 'afternoon' | 'evening';
  notes: string;
  base_price: number | null;
  is_recurring: boolean;
  recurring_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurring_end_date?: string;
  custom_description?: string;
  custom_price?: number;
}

interface ScheduleServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (service: ServiceFormData) => Promise<void>;
  preSelectedCustomerId?: string;
}

const INITIAL_FORM_DATA: ServiceFormData = {
  property_id: '',
  service_type_id: '',
  assigned_technician_id: '',
  scheduled_date: new Date().toISOString().split('T')[0],
  scheduled_time_window: 'morning',
  notes: '',
  base_price: null,
  is_recurring: false,
  custom_description: '',
  custom_price: 0,
};

export const ScheduleServiceModal = ({ isOpen, onClose, onSchedule, preSelectedCustomerId }: ScheduleServiceModalProps) => {
  const [formData, setFormData] = useState<ServiceFormData>(INITIAL_FORM_DATA);
  const [properties, setProperties] = useState<Array<{
    id: string;
    address_line1: string;
    city: string;
    state: string;
    customer: { first_name: string; last_name: string; };
  }>>([]);
  const [serviceTypes, setServiceTypes] = useState<Array<{
    id: string;
    label: string;
    base_price: number;
  }>>([]);
  const [technicians, setTechnicians] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    if (isOpen) {
      fetchServiceTypes();
      fetchTechnicians();
      if (preSelectedCustomerId) {
        fetchCustomerProperties(preSelectedCustomerId);
      } else {
        fetchAllProperties();
      }
    } else {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
    }
  }, [isOpen, preSelectedCustomerId]);

  const fetchCustomerProperties = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          address_line1,
          city,
          state,
          customer:customers (
            first_name,
            last_name
          )
        `)
        .eq('customer_id', customerId);

      if (error) throw error;
      setProperties(data || []);

      // If there's only one property, select it automatically
      if (data && data.length === 1) {
        handleInputChange('property_id', data[0].id);
      }
    } catch (err) {
      console.error('Error fetching customer properties:', err);
      toast.error('Failed to load properties');
    }
  };

  const fetchAllProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          address_line1,
          city,
          state,
          customer:customers (
            first_name,
            last_name
          )
        `);

      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
      toast.error('Failed to load properties');
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('id, label, base_price');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (err) {
      console.error('Error fetching service types:', err);
      toast.error('Failed to load service types');
    }
  };

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('id, first_name, last_name')
        .eq('status', 'active');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (err) {
      console.error('Error fetching technicians:', err);
      toast.error('Failed to load technicians');
    }
  };

  const handleInputChange = (name: keyof ServiceFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // If service type changes, update base price
      if (name === 'service_type_id') {
        if (value === 'custom') {
          newData.base_price = newData.custom_price || 0;
        } else {
          const serviceType = serviceTypes.find(st => st.id === value);
          if (serviceType) {
            newData.base_price = serviceType.base_price;
          }
        }
      }

      // Update base price when custom price changes
      if (name === 'custom_price' && formData.service_type_id === 'custom') {
        newData.base_price = Number(value) || 0;
      }

      // Clear recurring fields if is_recurring is set to false
      if (name === 'is_recurring' && !value) {
        delete newData.recurring_frequency;
        delete newData.recurring_end_date;
      }

      return newData;
    });
    
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

    if (!formData.property_id) newErrors.property_id = 'Property is required';
    if (!formData.service_type_id) newErrors.service_type_id = 'Service type is required';
    if (!formData.assigned_technician_id) newErrors.assigned_technician_id = 'Technician is required';
    if (!formData.scheduled_date) newErrors.scheduled_date = 'Date is required';
    if (!formData.scheduled_time_window) newErrors.scheduled_time_window = 'Time window is required';
    
    if (formData.service_type_id === 'custom') {
      if (!formData.custom_description) {
        newErrors.custom_description = 'Description is required for custom services';
      }
      if (!formData.custom_price || formData.custom_price <= 0) {
        newErrors.custom_price = 'Valid price is required for custom services';
      }
    }
    
    if (formData.is_recurring) {
      if (!formData.recurring_frequency) {
        newErrors.recurring_frequency = 'Frequency is required for recurring services';
      }
      if (!formData.recurring_end_date) {
        newErrors.recurring_end_date = 'End date is required for recurring services';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      toast.error('Please correct the highlighted errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare service data
      const serviceData = {
        property_id: formData.property_id,
        service_type_id: formData.service_type_id === 'custom' ? null : formData.service_type_id,
        assigned_technician_id: formData.assigned_technician_id,
        scheduled_date: formData.scheduled_date,
        scheduled_time_window: formData.scheduled_time_window,
        notes: formData.notes || null,
        base_price: formData.base_price,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.recurring_frequency || null,
        recurring_end_date: formData.recurring_end_date || null,
        status: 'pending',
        description: formData.service_type_id === 'custom' ? formData.custom_description : null
      };

      // Create the service schedule
      const { data: service, error: serviceError } = await supabase
        .from('service_schedules')
        .insert(serviceData)
        .select(`
          *,
          property:properties (
            address_line1,
            city,
            state,
            customer:customers (
              first_name,
              last_name
            )
          ),
          service_type:service_types (
            label,
            base_price
          ),
          technician:technicians (
            first_name,
            last_name
          )
        `)
        .single();

      if (serviceError) {
        console.error('Service creation error:', serviceError);
        throw new Error(serviceError.message);
      }

      if (!service) {
        throw new Error('No service data returned after creation');
      }

      await onSchedule(service);
      toast.success('Service scheduled successfully!');
      onClose();
    } catch (error) {
      console.error('Error scheduling service:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule service');
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" />
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
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 text-left shadow-xl transition-all dark:bg-gray-800 sm:my-8">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none dark:hover:text-gray-300"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <Icon icon={XMarkIcon} />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                      Schedule Service
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6">
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <FormField
                            label="Property"
                            name="property_id"
                            value={formData.property_id}
                            onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                            error={errors.property_id}
                            as="select"
                            options={[
                              { value: '', label: 'Select a property' },
                              ...properties.map(p => ({
                                value: p.id,
                                label: `${p.address_line1}, ${p.city} - ${p.customer.first_name} ${p.customer.last_name}`
                              }))
                            ]}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormField
                            label="Service Type"
                            name="service_type_id"
                            value={formData.service_type_id}
                            onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                            error={errors.service_type_id}
                            as="select"
                            options={[
                              { value: '', label: 'Select a service type' },
                              { value: 'custom', label: '+ Custom Service' },
                              ...serviceTypes.map(st => ({
                                value: st.id,
                                label: `${st.label} - $${st.base_price.toFixed(2)}`
                              }))
                            ]}
                          />
                        </div>

                        {formData.service_type_id === 'custom' && (
                          <>
                            <div className="sm:col-span-2">
                              <FormField
                                label="Custom Service Description"
                                name="custom_description"
                                value={formData.custom_description || ''}
                                onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                                error={errors.custom_description}
                                as="textarea"
                                placeholder="Enter a description of the custom service..."
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <FormField
                                label="Custom Price"
                                name="custom_price"
                                type="number"
                                value={formData.custom_price?.toString() || '0'}
                                onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, Number(value))}
                                error={errors.custom_price}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </>
                        )}

                        <div className="sm:col-span-2">
                          <FormField
                            label="Technician"
                            name="assigned_technician_id"
                            value={formData.assigned_technician_id}
                            onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                            error={errors.assigned_technician_id}
                            as="select"
                            options={[
                              { value: '', label: 'Select a technician' },
                              ...technicians.map(t => ({
                                value: t.id,
                                label: `${t.first_name} ${t.last_name}`
                              }))
                            ]}
                          />
                        </div>

                        <FormField
                          label="Date"
                          name="scheduled_date"
                          type="date"
                          value={formData.scheduled_date}
                          onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                          error={errors.scheduled_date}
                        />

                        <FormField
                          label="Time Window"
                          name="scheduled_time_window"
                          value={formData.scheduled_time_window}
                          onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                          error={errors.scheduled_time_window}
                          as="select"
                          options={[
                            { value: 'morning', label: '8:00 AM - 12:00 PM' },
                            { value: 'afternoon', label: '12:00 PM - 4:00 PM' },
                            { value: 'evening', label: '4:00 PM - 8:00 PM' }
                          ]}
                        />

                        <div className="sm:col-span-2">
                          <FormField
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                            as="textarea"
                            rows={3}
                            placeholder="Enter any special instructions or notes..."
                            required={false}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormField
                            label="Recurring Service"
                            name="is_recurring"
                            type="checkbox"
                            value={formData.is_recurring ? "true" : "false"}
                            onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value === "true")}
                            required={false}
                          />
                        </div>

                        {formData.is_recurring && (
                          <>
                            <FormField
                              label="Frequency"
                              name="recurring_frequency"
                              value={formData.recurring_frequency || ''}
                              onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                              error={errors.recurring_frequency}
                              as="select"
                              options={[
                                { value: '', label: 'Select frequency' },
                                { value: 'weekly', label: 'Weekly' },
                                { value: 'biweekly', label: 'Bi-weekly' },
                                { value: 'monthly', label: 'Monthly' }
                              ]}
                            />

                            <FormField
                              label="End Date"
                              name="recurring_end_date"
                              type="date"
                              value={formData.recurring_end_date || ''}
                              onValueChange={(name, value) => handleInputChange(name as keyof ServiceFormData, value)}
                              error={errors.recurring_end_date}
                            />
                          </>
                        )}
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
                          disabled={isSubmitting}
                          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmitting ? 'Scheduling...' : 'Schedule Service'}
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