import { Fragment, useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';
import { FormField } from '../ui/FormField';
import { AddPropertyModal } from '../properties/AddPropertyModal';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import debounce from 'lodash/debounce';
import { formatPhoneNumber, isValidPhoneNumber } from '../../utils/formatters';
import { PhoneInput } from '../ui/PhoneInput';

interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  referral_source: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customer: CustomerFormData) => Promise<string>;
  addProperty: (propertyData: {
    customer_id: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip_code: string;
    property_size?: number;
    lawn_size?: number;
    has_irrigation: boolean;
    has_pets: boolean;
  }) => Promise<void>;
}

const INITIAL_FORM_DATA: CustomerFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company_name: '',
  billing_address: '',
  billing_city: '',
  billing_state: '',
  billing_zip: '',
  referral_source: ''
};

export const AddCustomerModal = ({ isOpen, onClose, onAdd, addProperty }: AddCustomerModalProps) => {
  const [formData, setFormData] = useState<CustomerFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [addedCustomerId, setAddedCustomerId] = useState<string | null>(null);
  const [addedCustomerData, setAddedCustomerData] = useState<CustomerFormData | null>(null);

  // Debounced email check
  const debouncedEmailCheck = useCallback(
    debounce(async (email: string) => {
      if (!email) return;
      
      try {
        setIsCheckingEmail(true);
        const { data, error } = await supabase
          .from('customers')
          .select('id')
          .eq('email', email.toLowerCase().trim());

        if (error) {
          console.error('Error checking email:', error);
          return;
        }

        // If we got any results, the email exists
        if (data && data.length > 0) {
          setErrors(prev => ({
            ...prev,
            email: 'This email is already registered'
          }));
        }
      } catch (err) {
        console.error('Error checking email:', err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500),
    []
  );

  // Format phone number
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 10) return value;

    let formattedPhone = '';
    if (digits.length > 0) formattedPhone += '(' + digits.slice(0, 3);
    if (digits.length > 3) formattedPhone += ') ' + digits.slice(3, 6);
    if (digits.length > 6) formattedPhone += '-' + digits.slice(6, 10);
    return formattedPhone;
  };

  const handleInputChange = (name: keyof CustomerFormData, value: string) => {
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Handle phone number formatting
    if (name === 'phone') {
      value = formatPhoneNumber(value);
    }

    // Handle email
    if (name === 'email') {
      value = value.toLowerCase().trim();
      if (value) {
        debouncedEmailCheck(value);
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedEmailCheck.cancel();
    };
  }, [debouncedEmailCheck]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setShowPropertyModal(false);
      setAddedCustomerId(null);
      setAddedCustomerData(null);
      setIsSubmitting(false);
      setIsCheckingEmail(false);
      debouncedEmailCheck.cancel();
    }
  }, [isOpen]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: ValidationErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    
    // Email validation
    const email = formData.email.trim().toLowerCase();
    if (!email) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        // Check if email exists
        try {
          const { data, error } = await supabase
            .from('customers')
            .select('id')
            .eq('email', email);

          if (error) {
            console.error('Error checking email:', error);
          } else if (data && data.length > 0) {
            newErrors.email = 'This email is already registered';
          }
        } catch (err) {
          console.error('Error checking email:', err);
        }
      }
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(formData.phone)) {
      newErrors.phone = 'Phone format should be (XXX) XXX-XXXX';
    }

    if (!formData.billing_address.trim()) newErrors.billing_address = 'Billing address is required';
    if (!formData.billing_city.trim()) newErrors.billing_city = 'City is required';
    if (!formData.billing_state.trim()) newErrors.billing_state = 'State is required';
    if (!formData.billing_zip.trim()) {
      newErrors.billing_zip = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.billing_zip)) {
      newErrors.billing_zip = 'Invalid ZIP code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      // Format phone number before validation
      const formattedPhone = formatPhoneNumber(formData.phone);
      
      // Validate phone number format
      if (!isValidPhoneNumber(formattedPhone)) {
        setErrors(prev => ({
          ...prev,
          phone: 'Please enter a valid US/Canada phone number'
        }));
        return;
      }

      // Update form data with formatted phone
      const customerData = {
        ...formData,
        phone: formattedPhone
      };

      const customerId = await onAdd(customerData);

      if (!customerId) {
        throw new Error('No customer ID returned');
      }
      setAddedCustomerId(customerId);
      setAddedCustomerData(customerData);
      setShowPropertyModal(true);
      toast.success('Customer added successfully! Please add a property.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      if (errorMessage.includes('email already exists')) {
        setErrors(prev => ({
          ...prev,
          email: 'This email is already registered'
        }));
      } else {
        toast.error(`Failed to add customer: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePropertyAdd = async (propertyData: any) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const propertyId = await addProperty({
        ...propertyData,
        customer_id: addedCustomerId as string
      });
      
      if (!propertyId) {
        throw new Error('No property ID returned');
      }

      // Only close modals after successful property creation
      setShowPropertyModal(false);
      setAddedCustomerId(null);
      setAddedCustomerData(null);
      onClose();
      return propertyId;
    } catch (error) {
      console.error('Error adding property:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to add property: ${errorMessage}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePropertyModalClose = () => {
    // Just close both modals
    setShowPropertyModal(false);
    setAddedCustomerId(null);
    setAddedCustomerData(null);
    onClose();
  };

  const handleClose = () => {
    if (!isSubmitting && !showPropertyModal) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setShowPropertyModal(false);
      setAddedCustomerId(null);
      setAddedCustomerData(null);
      onClose();
    }
  };

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={showPropertyModal || isSubmitting ? () => {} : handleClose}
          static={showPropertyModal || isSubmitting}
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
                      onClick={handleClose}
                    >
                      <span className="sr-only">Close</span>
                      <Icon icon={XMarkIcon} />
                    </button>
                  </div>
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                        Add New Customer
                      </Dialog.Title>
                      <form onSubmit={handleSubmit} className="mt-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                          <FormField
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onValueChange={handleInputChange}
                            error={errors.first_name}
                            placeholder="John"
                          />
                          <FormField
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onValueChange={handleInputChange}
                            error={errors.last_name}
                            placeholder="Smith"
                          />
                          <FormField
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onValueChange={handleInputChange}
                            error={errors.email}
                            placeholder="john@example.com"
                          />
                          <div className="col-span-6 sm:col-span-3">
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                              Phone Number
                            </label>
                            <PhoneInput
                              value={formData.phone}
                              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                              required
                              error={errors.phone}
                            />
                          </div>
                          <FormField
                            label="Company Name"
                            name="company_name"
                            value={formData.company_name}
                            onValueChange={handleInputChange}
                            required={false}
                            placeholder="Company Name (Optional)"
                          />
                          <div className="sm:col-span-2">
                            <FormField
                              label="Billing Address"
                              name="billing_address"
                              value={formData.billing_address}
                              onValueChange={handleInputChange}
                              error={errors.billing_address}
                              placeholder="123 Main St"
                            />
                          </div>
                          <FormField
                            label="City"
                            name="billing_city"
                            value={formData.billing_city}
                            onValueChange={handleInputChange}
                            error={errors.billing_city}
                            placeholder="Anytown"
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              label="State"
                              name="billing_state"
                              value={formData.billing_state}
                              onValueChange={handleInputChange}
                              error={errors.billing_state}
                              placeholder="CA"
                            />
                            <FormField
                              label="ZIP Code"
                              name="billing_zip"
                              value={formData.billing_zip}
                              onValueChange={handleInputChange}
                              error={errors.billing_zip}
                              placeholder="12345"
                            />
                          </div>
                          <FormField
                            label="Referral Source"
                            name="referral_source"
                            value={formData.referral_source}
                            onValueChange={handleInputChange}
                            required={false}
                            placeholder="How did you hear about us?"
                          />
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || isCheckingEmail}
                            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSubmitting ? 'Adding...' : 'Add Customer'}
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

      {showPropertyModal && addedCustomerId && addedCustomerData && (
        <AddPropertyModal
          isOpen={showPropertyModal}
          onClose={handlePropertyModalClose}
          onAdd={handlePropertyAdd}
          customers={[{
            id: addedCustomerId,
            first_name: addedCustomerData.first_name,
            last_name: addedCustomerData.last_name
          }]}
          prefilledAddress={{
            address_line1: addedCustomerData.billing_address,
            city: addedCustomerData.billing_city,
            state: addedCustomerData.billing_state,
            zip_code: addedCustomerData.billing_zip
          }}
        />
      )}
    </>
  );
}; 