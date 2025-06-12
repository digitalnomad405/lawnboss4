import { useState } from 'react';
import { FormField } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { useSupabase } from '../../hooks/useSupabase';

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

interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    customer_id: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip_code: string;
    property_size: number | null;
    lawn_size: number | null;
    has_irrigation: boolean;
    has_pets: boolean;
  };
  onSuccess?: () => void;
}

type ValidationErrors = Partial<Record<keyof PropertyFormData, string>>;

export const EditPropertyModal = ({ isOpen, onClose, property, onSuccess }: EditPropertyModalProps) => {
  const [formData, setFormData] = useState<PropertyFormData>({
    customer_id: property.customer_id,
    address_line1: property.address_line1,
    address_line2: property.address_line2 || '',
    city: property.city,
    state: property.state,
    zip_code: property.zip_code,
    property_size: property.property_size,
    lawn_size: property.lawn_size,
    has_irrigation: property.has_irrigation,
    has_pets: property.has_pets,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { supabase } = useSupabase();

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.address_line1.trim()) newErrors.address_line1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zip_code.trim()) {
      newErrors.zip_code = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
      newErrors.zip_code = 'Invalid ZIP code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name: keyof PropertyFormData, value: string | number | boolean) => {
    console.log('Input change:', name, value);
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData(prev => {
      const newData = { ...prev };
      if (name === 'property_size' || name === 'lawn_size') {
        newData[name] = value === '' ? null : Number(value);
      } else if (name === 'has_irrigation' || name === 'has_pets') {
        newData[name] = Boolean(value);
      } else {
        newData[name] = value;
      }
      console.log('Updated form data:', newData);
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    if (!validateForm()) {
      console.log('Form validation failed with errors:', errors);
      toast.error('Please correct the highlighted errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Sending update to Supabase:', formData);
      const { data, error } = await supabase
        .from('properties')
        .update({
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || null,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          property_size: formData.property_size,
          lawn_size: formData.lawn_size,
          has_irrigation: formData.has_irrigation,
          has_pets: formData.has_pets,
          updated_at: new Date().toISOString(),
        })
        .eq('id', property.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful:', data);
      toast.success('Property updated successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating property:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update property: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Property"
      preventClose={isSubmitting}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              label="Address Line 1"
              name="address_line1"
              value={formData.address_line1}
              onValueChange={handleInputChange}
              error={errors.address_line1}
              placeholder="123 Main St"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <FormField
              label="Address Line 2"
              name="address_line2"
              value={formData.address_line2}
              onValueChange={handleInputChange}
              error={errors.address_line2}
              required={false}
              placeholder="Apt 4B"
            />
          </div>

          <FormField
            label="City"
            name="city"
            value={formData.city}
            onValueChange={handleInputChange}
            error={errors.city}
            placeholder="Anytown"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="State"
              name="state"
              value={formData.state}
              onValueChange={handleInputChange}
              error={errors.state}
              placeholder="CA"
              required
            />
            <FormField
              label="ZIP Code"
              name="zip_code"
              value={formData.zip_code}
              onValueChange={handleInputChange}
              error={errors.zip_code}
              placeholder="12345"
              required
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
          />

          <FormField
            label="Has Pets"
            name="has_pets"
            type="checkbox"
            value={formData.has_pets}
            onValueChange={handleInputChange}
            required={false}
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}; 