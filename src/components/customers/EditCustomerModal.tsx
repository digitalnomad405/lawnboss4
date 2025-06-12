import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';
import { formatPhoneNumber, isValidPhoneNumber } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import { PhoneInput } from '../ui/PhoneInput';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    preferredTime: string;
    notes: string;
  };
  onUpdate: (data: any) => void;
}

export const EditCustomerModal = ({ isOpen, onClose, customer, onUpdate }: EditCustomerModalProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phone, setPhone] = useState(customer.phone);
  const [formData, setFormData] = useState({
    first_name: customer.name.split(' ')[0],
    last_name: customer.name.split(' ').slice(1).join(' '),
    email: customer.email,
    phone: customer.phone,
    billing_address: customer.address.split(',')[0].trim(),
    billing_city: customer.address.split(',')[1]?.trim() || '',
    billing_state: customer.address.split(',')[2]?.trim().split(' ')[0] || '',
    billing_zip: customer.address.split(',')[2]?.trim().split(' ')[1] || '',
    referral_source: customer.notes
  });

  useEffect(() => {
    if (isOpen) {
      setPhone(customer.phone);
      setFormData({
        first_name: customer.name.split(' ')[0],
        last_name: customer.name.split(' ').slice(1).join(' '),
        email: customer.email,
        phone: customer.phone,
        billing_address: customer.address.split(',')[0].trim(),
        billing_city: customer.address.split(',')[1]?.trim() || '',
        billing_state: customer.address.split(',')[2]?.trim().split(' ')[0] || '',
        billing_zip: customer.address.split(',')[2]?.trim().split(' ')[1] || '',
        referral_source: customer.notes
      });
      setErrors({});
    }
  }, [isOpen, customer]);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
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

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.billing_address.trim()) newErrors.billing_address = 'Address is required';
    if (!formData.billing_city.trim()) newErrors.billing_city = 'City is required';
    if (!formData.billing_state.trim()) newErrors.billing_state = 'State is required';
    if (!formData.billing_zip.trim()) newErrors.billing_zip = 'ZIP code is required';
    if (!isValidPhoneNumber(phone)) newErrors.phone = 'Please enter a valid phone number';

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
      await onUpdate({
        ...formData,
        phone
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update customer: ${errorMessage}`);
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
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      Edit Customer
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="first_name"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            First Name
                          </label>
                          <input
                            type="text"
                            name="first_name"
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                          {errors.first_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="last_name"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Last Name
                          </label>
                          <input
                            type="text"
                            name="last_name"
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                          {errors.last_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Phone Number
                          </label>
                          <PhoneInput
                            value={phone}
                            onChange={setPhone}
                            required
                            error={errors.phone}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="billing_address"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Address
                          </label>
                          <input
                            type="text"
                            name="billing_address"
                            id="billing_address"
                            value={formData.billing_address}
                            onChange={(e) => handleInputChange('billing_address', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                          {errors.billing_address && (
                            <p className="mt-1 text-sm text-red-600">{errors.billing_address}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="billing_city"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            City
                          </label>
                          <input
                            type="text"
                            name="billing_city"
                            id="billing_city"
                            value={formData.billing_city}
                            onChange={(e) => handleInputChange('billing_city', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                          {errors.billing_city && (
                            <p className="mt-1 text-sm text-red-600">{errors.billing_city}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="billing_state"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            State
                          </label>
                          <input
                            type="text"
                            name="billing_state"
                            id="billing_state"
                            value={formData.billing_state}
                            onChange={(e) => handleInputChange('billing_state', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                          {errors.billing_state && (
                            <p className="mt-1 text-sm text-red-600">{errors.billing_state}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="billing_zip"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            name="billing_zip"
                            id="billing_zip"
                            value={formData.billing_zip}
                            onChange={(e) => handleInputChange('billing_zip', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                          {errors.billing_zip && (
                            <p className="mt-1 text-sm text-red-600">{errors.billing_zip}</p>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="referral_source"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Referral Source
                          </label>
                          <textarea
                            id="referral_source"
                            name="referral_source"
                            rows={3}
                            value={formData.referral_source}
                            onChange={(e) => handleInputChange('referral_source', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={onClose}
                          disabled={isSubmitting}
                          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={isSubmitting}
                          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </motion.button>
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