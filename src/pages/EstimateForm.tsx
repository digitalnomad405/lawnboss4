import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useSupabase } from '../hooks/useSupabase';
import { Icon } from '../components/ui/Icon';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AddCustomerModal } from '../components/customers/AddCustomerModal';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import debounce from 'lodash/debounce';
import axios from 'axios';
import { PostgrestError } from '@supabase/supabase-js';

interface EstimateItem {
  id?: string;
  service_type_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
}

interface EstimateFormData {
  customer_id: string;
  property_id: string;
  title: string;
  description: string;
  valid_until: string;
  notes: string;
  items: EstimateItem[];
  status: 'draft' | 'sent' | 'opportunity_won' | 'opportunity_lost';
}

const calculateItemTotals = (item: Partial<EstimateItem>): EstimateItem => {
  // Ensure we have valid numbers
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const taxRate = Number(item.tax_rate) || 0;
  
  // Calculate totals
  const subtotal = Number((quantity * unitPrice).toFixed(2));
  const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));

  return {
    ...item,
    service_type_id: item.service_type_id || '',
    description: item.description || '',
    quantity,
    unit_price: unitPrice,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    subtotal,
    total,
  } as EstimateItem;
};

const EstimateFormContent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { supabase, customers, properties, serviceTypes, addProperty, addCustomer } = useSupabase();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<EstimateFormData>({
    customer_id: '',
    property_id: '',
    title: '',
    description: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    notes: '',
    items: [],
    status: 'draft'
  });
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [estimateId, setEstimateId] = useState<string | undefined>(id);

  // Memoize derived data
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === formData.customer_id),
    [customers, formData.customer_id]
  );

  const customerProperties = useMemo(() =>
    properties.filter(p => p.customer_id === formData.customer_id),
    [properties, formData.customer_id]
  );

  const totals = useMemo(() => ({
    subtotal: formData.items.reduce((sum, item) => sum + item.subtotal, 0),
    tax: formData.items.reduce((sum, item) => sum + item.tax_amount, 0),
    total: formData.items.reduce((sum, item) => sum + item.total, 0),
  }), [formData.items]);

  // Debounced form update functions
  const debouncedSetFormData = useCallback(
    debounce((newData: Partial<EstimateFormData>) => {
      setFormData(prev => ({ ...prev, ...newData }));
    }, 100),
    []
  );

  useEffect(() => {
    if (id) {
      loadEstimate();
    }
  }, [id]);

  const loadEstimate = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const { data: estimate, error } = await supabase
        .from('estimates')
        .select(`
          *,
          estimate_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (estimate) {
        console.log('Loaded estimate:', estimate); // Add logging
        setFormData({
          customer_id: estimate.customer_id || '',
          property_id: estimate.property_id || '',
          title: estimate.title || '',
          description: estimate.description || '',
          valid_until: estimate.valid_until || '',
          notes: estimate.notes || '',
          items: estimate.estimate_items || [],
          status: estimate.status || 'draft'
        });
      }
    } catch (error) {
      console.error('Error loading estimate:', error);
      toast.error('Failed to load estimate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerChange = useCallback((customerId: string) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      property_id: '', // Reset property when customer changes
    }));
  }, []);

  const handleAddItem = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, calculateItemTotals({
        service_type_id: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
      })],
    }));
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const handleItemChange = useCallback((index: number, field: keyof EstimateItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = calculateItemTotals({
        ...newItems[index],
        [field]: value,
      });
      return { ...prev, items: newItems };
    });
  }, []);

  const handleServiceTypeChange = useCallback((index: number, serviceTypeId: string) => {
    const serviceType = serviceTypes.find(st => st.id === serviceTypeId);
    if (serviceType) {
      setFormData(prev => {
        const newItems = [...prev.items];
        newItems[index] = calculateItemTotals({
          ...newItems[index],
          service_type_id: serviceTypeId,
          description: serviceType.description || '',
          unit_price: serviceType.base_price || 0,
          tax_rate: serviceType.tax_rate || 0,
        });
        return { ...prev, items: newItems };
      });
    }
  }, [serviceTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Debug log the form data
    console.log('Form data:', formData);

    // Validate required fields
    if (!formData.customer_id || !formData.property_id) {
      toast.error('Please select a customer and property');
      return;
    }

    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.valid_until) {
      toast.error('Please select a valid until date');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsLoading(true);

    try {
      // Calculate totals
      const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
      const tax_amount = formData.items.reduce((sum, item) => sum + item.tax_amount, 0);
      const total_amount = subtotal + tax_amount;

      // Create estimate data
      const estimateData = {
        customer_id: formData.customer_id,
        property_id: formData.property_id,
        title: formData.title,
        description: formData.description || '',
        valid_until: formData.valid_until,
        notes: formData.notes || '',
        subtotal,
        tax_amount,
        total_amount,
        status: 'draft'
      };

      console.log('Creating estimate with data:', estimateData);

      // Create new estimate
      const { data: newEstimate, error: createError } = await supabase
        .from('estimates')
        .insert([estimateData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating estimate:', createError);
        throw createError;
      }

      if (!newEstimate?.id) {
        throw new Error('No estimate ID returned after creation');
      }

      console.log('Created estimate:', newEstimate);

      // Prepare estimate items
      const estimateItems = formData.items.map(item => {
        // Log each item as we process it
        console.log('Processing item:', item);

        // Create base item with required fields
        const baseItem = {
          estimate_id: newEstimate.id,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          tax_rate: item.tax_rate || 0,
          tax_amount: item.tax_amount || 0,
          subtotal: item.subtotal || 0
        };

        // Only add service_type_id if it's a valid non-empty value
        if (item.service_type_id && typeof item.service_type_id === 'string' && item.service_type_id.trim() !== '') {
          return {
            ...baseItem,
            service_type_id: item.service_type_id
          };
        }

        return baseItem;
      });

      console.log('Final estimate items to insert:', estimateItems);

      // Insert all items at once
      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(estimateItems);

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        // Delete the estimate if items fail
        await supabase
          .from('estimates')
          .delete()
          .eq('id', newEstimate.id);
        throw itemsError;
      }

      toast.success('Estimate saved successfully');
      navigate('/estimates');
    } catch (error) {
      console.error('Full error details:', error instanceof Error ? {
        message: error.message,
        ...(error as any)
      } : error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(`Failed to save estimate: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProperty = async (propertyData: any) => {
    try {
      setIsAddingProperty(true);
      console.log('EstimateForm: Adding property with data:', propertyData);
      
      const newPropertyId = await addProperty(propertyData);
      console.log('EstimateForm: Property added successfully, ID:', newPropertyId);

      if (!newPropertyId) {
        throw new Error('No property ID returned');
      }

      // Update the form with the new property ID
      setFormData(prev => ({
        ...prev,
        property_id: newPropertyId
      }));

      // Close the add customer modal
      setShowAddCustomerModal(false);
      toast.success('Property added successfully');
      return newPropertyId;
    } catch (error) {
      console.error('EstimateForm: Error adding property:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to add property: ${errorMessage}`);
      throw error;
    } finally {
      setIsAddingProperty(false);
    }
  };

  const handleStatusChange = async (newStatus: 'opportunity_won' | 'opportunity_lost') => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setFormData(prev => ({ ...prev, status: newStatus }));
      toast.success(newStatus === 'opportunity_won' ? 'Opportunity Won!' : 'Opportunity Lost');
      
      // Navigate back to estimates list after status update
      navigate('/estimates');
    } catch (error) {
      console.error('Error updating estimate status:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update status: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      console.log('Sending estimate email for ID:', id);

      // First update the status to sent
      const { error: updateError } = await supabase
        .from('estimates')
        .update({ status: 'sent' })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating status:', updateError);
        throw updateError;
      }

      // Send the email using Supabase Edge Function
      console.log('Invoking Edge Function with body:', { estimateId: id });
      const { data, error } = await supabase.functions.invoke('send-estimate-email', {
        body: { estimateId: id }
      });

      if (error) {
        console.error('Function error:', error);
        // If email fails, revert status
        await supabase
          .from('estimates')
          .update({ status: 'draft' })
          .eq('id', id);
        throw error;
      }

      console.log('Function response:', data);
      setFormData(prev => ({ ...prev, status: 'sent' }));
      toast.success('Estimate sent successfully!');
    } catch (error) {
      console.error('Full error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // If email fails, revert status
      await supabase
        .from('estimates')
        .update({ status: 'draft' })
        .eq('id', id);

      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(`Failed to send estimate: ${errorMessage}`);
    }
  };

  // Add a function to handle property selection
  const handlePropertyChange = useCallback((propertyId: string) => {
    setFormData(prev => ({
      ...prev,
      property_id: propertyId
    }));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/estimates')}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formData.title || (id ? 'Edit Estimate' : 'Create Estimate')}
            </h1>
            {formData.status && formData.status !== 'draft' && (
              <span className={`text-sm ${
                formData.status === 'opportunity_won' ? 'text-green-600' : 
                formData.status === 'opportunity_lost' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                Status: {formData.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {id && formData.status === 'sent' && (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange('opportunity_won')}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                disabled={isLoading}
              >
                <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                Won
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('opportunity_lost')}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                disabled={isLoading}
              >
                <XCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                Lost
              </button>
            </>
          )}
          {id && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/estimates/${id}/view`)}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <DocumentArrowUpIcon className="-ml-1 mr-2 h-5 w-5" />
              View PDF
            </motion.button>
          )}
          {id && formData.status === 'draft' && (
            <button
              type="button"
              onClick={handleSendEmail}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              disabled={isLoading}
            >
              <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5" />
              Send Email
            </button>
          )}
        </div>
      </div>

      <form id="estimate-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Customer & Property Selection */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Customer
            </label>
            <div className="mt-1 flex gap-2">
              <select
                value={formData.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                required
                disabled={isAddingProperty}
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isAddingProperty}
              >
                <PlusIcon className="-ml-0.5 mr-1 h-4 w-4" />
                New
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Property
            </label>
            <select
              value={formData.property_id}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              required
              disabled={!formData.customer_id || isAddingProperty}
            >
              <option value="">Select a property</option>
              {customerProperties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.address_line1}
                  {property.address_line2 && `, ${property.address_line2}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estimate Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => debouncedSetFormData({ title: e.target.value })}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Valid Until
            </label>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Line Items</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {formData.items.map((item, index) => (
              <div
                key={index}
                className="grid gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700 md:grid-cols-6"
              >
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Service Type
                  </label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={item.service_type_id || ''}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          handleItemChange(index, 'service_type_id', '');
                        } else {
                          handleServiceTypeChange(index, e.target.value);
                        }
                      }}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    >
                      <option value="">Custom Service</option>
                      {serviceTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Description
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    required
                    placeholder="Enter service description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.tax_rate}
                    onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-end justify-between md:col-span-6">
                  <div className="flex space-x-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Subtotal:</span>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Tax:</span>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                        ${item.tax_amount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Total:</span>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                        ${item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {formData.items.length === 0 && (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 dark:border-gray-700">
                <DocumentTextIcon className="h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No items added yet. Click "Add Item" to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        {formData.items.length > 0 && (
          <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Summary</h3>
            <dl className="mt-4 space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Subtotal</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  ${totals.subtotal.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Tax</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  ${totals.tax.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <dt className="text-base font-medium text-gray-900 dark:text-white">Total</dt>
                <dd className="text-base font-medium text-gray-900 dark:text-white">
                  ${totals.total.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
            placeholder="Add any additional notes or terms..."
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <DocumentTextIcon className="-ml-1 mr-2 h-5 w-5" />
                Save Estimate
              </>
            )}
          </button>
        </div>
      </form>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => !isAddingProperty && setShowAddCustomerModal(false)}
        onAdd={addCustomer}
        addProperty={handleAddProperty}
      />
    </div>
  );
};

export const EstimateForm = () => {
  return (
    <ErrorBoundary>
      <EstimateFormContent />
    </ErrorBoundary>
  );
}; 