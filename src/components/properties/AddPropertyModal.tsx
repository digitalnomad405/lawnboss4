import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';
import { FormField } from '../ui/FormField';
import { toast } from 'react-hot-toast';

interface PropertyFormData {
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
}

interface ValidationErrors {
  [key: string]: string;
}

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (property: PropertyFormData) => Promise<string>;
  customers: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
  prefilledAddress?: {
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
  };
}

const INITIAL_FORM_DATA: PropertyFormData = {
  customer_id: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  property_size: null,
  lawn_size: null,
  has_irrigation: false,
  has_pets: false,
};

const REQUIRED_FIELDS = ['customer_id', 'address_line1', 'city', 'state', 'zip_code'] as const;

export const AddPropertyModal = ({ isOpen, onClose, onAdd, customers, prefilledAddress }: AddPropertyModalProps) => {
  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useCustomerAddress, setUseCustomerAddress] = useState(false);

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setFormData(INITIAL_FORM_DATA);
        setErrors({});
        setUseCustomerAddress(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-select customer if only one exists
  useEffect(() => {
    if (customers.length === 1 && !formData.customer_id) {
      setFormData(prev => ({
        ...prev,
        customer_id: customers[0].id
      }));
    }
  }, [customers, formData.customer_id]);

  // Handle prefilled address
  useEffect(() => {
    if (isOpen && prefilledAddress) {
      setFormData(prev => ({
        ...prev,
        address_line1: prefilledAddress.address_line1,
        city: prefilledAddress.city,
        state: prefilledAddress.state,
        zip_code: prefilledAddress.zip_code
      }));
    }
  }, [isOpen, prefilledAddress]);

  const validateField = (name: keyof PropertyFormData, value: any): string | undefined => {
    if (REQUIRED_FIELDS.includes(name as any) && !value?.toString().trim()) {
      return `${name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} is required`;
    }
    if (name === 'zip_code' && value && !/^\d{5}(-\d{4})?$/.test(value.toString())) {
      return 'Invalid ZIP code format';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    for (const field of REQUIRED_FIELDS) {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name: keyof PropertyFormData, value: string | number | boolean) => {
    // Clear the specific error
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Update form data
    setFormData(prev => {
      const newData = { ...prev };
      if (name === 'property_size' || name === 'lawn_size') {
        newData[name] = value === '' ? null : Number(value);
      } else if (name === 'has_irrigation' || name === 'has_pets') {
        newData[name] = value as boolean;
      } else {
        newData[name] = value as string;
      }

      // Validate the field immediately
      const error = validateField(name, value);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }

      return newData;
    });
  };

  const handleUseCustomerAddress = (checked: boolean) => {
    setUseCustomerAddress(checked);
    if (checked && prefilledAddress) {
      setFormData(prev => ({
        ...prev,
        address_line1: prefilledAddress.address_line1,
        city: prefilledAddress.city,
        state: prefilledAddress.state,
        zip_code: prefilledAddress.zip_code
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please correct the highlighted errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const propertyData = {
        ...formData,
        property_size: typeof formData.property_size === 'number' ? formData.property_size : null,
        lawn_size: typeof formData.lawn_size === 'number' ? formData.lawn_size : null,
        has_irrigation: Boolean(formData.has_irrigation),
        has_pets: Boolean(formData.has_pets)
      };

      const propertyId = await onAdd(propertyData);
      
      if (!propertyId) {
        throw new Error('No property ID returned');
      }

      toast.success('Property added successfully');
      onClose();
    } catch (error) {
      console.error('Error adding property:', error);
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes('duplicate')) {
          toast.error('A property with this address already exists');
        } else if (error.message.toLowerCase().includes('validation')) {
          toast.error('Please check all required fields');
        } else {
          toast.error(`Failed to add property: ${error.message}`);
        }
      } else {
        toast.error('An unexpected error occurred while adding the property');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={isSubmitting ? () => {} : onClose}
        static={isSubmitting}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    <span className="sr-only">Close</span>
                    <Icon icon={XMarkIcon} />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                      Add New Property
                    </Dialog.Title>
                    <form id="property-form" onSubmit={handleSubmit} className="mt-6">
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <FormField
                            label="Customer"
                            name="customer_id"
                            value={formData.customer_id}
                            onValueChange={handleInputChange}
                            error={errors.customer_id}
                            as="select"
                            options={[
                              { value: '', label: 'Select a customer' },
                              ...customers.map(c => ({
                                value: c.id,
                                label: `${c.first_name} ${c.last_name}`
                              }))
                            ]}
                          />
                        </div>

                        {prefilledAddress && (
                          <div className="sm:col-span-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={useCustomerAddress}
                                onChange={(e) => handleUseCustomerAddress(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Use customer's billing address
                              </span>
                            </label>
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <FormField
                            label="Address Line 1"
                            name="address_line1"
                            value={formData.address_line1}
                            onValueChange={handleInputChange}
                            error={errors.address_line1}
                            placeholder="123 Main St"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <FormField
                            label="Address Line 2"
                            name="address_line2"
                            value={formData.address_line2}
                            onValueChange={handleInputChange}
                            required={false}
                            placeholder="Apt, Suite, etc."
                          />
                        </div>
                        <FormField
                          label="City"
                          name="city"
                          value={formData.city}
                          onValueChange={handleInputChange}
                          error={errors.city}
                          placeholder="Anytown"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            label="State"
                            name="state"
                            value={formData.state}
                            onValueChange={handleInputChange}
                            error={errors.state}
                            placeholder="CA"
                          />
                          <FormField
                            label="ZIP Code"
                            name="zip_code"
                            value={formData.zip_code}
                            onValueChange={handleInputChange}
                            error={errors.zip_code}
                            placeholder="12345"
                          />
                        </div>
                        <FormField
                          label="Property Size (sq ft)"
                          name="property_size"
                          type="number"
                          value={formData.property_size?.toString() || ''}
                          onValueChange={handleInputChange}
                          required={false}
                          placeholder="Total property size"
                        />
                        <FormField
                          label="Lawn Size (sq ft)"
                          name="lawn_size"
                          type="number"
                          value={formData.lawn_size?.toString() || ''}
                          onValueChange={handleInputChange}
                          required={false}
                          placeholder="Lawn area size"
                        />
                        <FormField
                          label="Has Irrigation System"
                          name="has_irrigation"
                          type="checkbox"
                          value={formData.has_irrigation}
                          onValueChange={handleInputChange}
                          required={false}
                          aria-label="Property has irrigation system"
                        />
                        <FormField
                          label="Has Pets"
                          name="has_pets"
                          type="checkbox"
                          value={formData.has_pets}
                          onValueChange={handleInputChange}
                          required={false}
                          aria-label="Property has pets"
                        />
                      </div>
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={onClose}
                          disabled={isSubmitting}
                          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmitting ? 'Adding...' : 'Add Property'}
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