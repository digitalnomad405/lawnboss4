import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';
import { FormField } from '../ui/FormField';
import { toast } from 'react-hot-toast';
import { useSupabase } from '../../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateInvoice: (invoiceData: any) => Promise<void>;
  preSelectedCustomerId?: string;
}

interface FormData {
  customer_id: string;
  property_id: string;
  service_schedule_id: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  payment_terms: number;
  tax_exempt: boolean;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  amount_paid: number;
  balance: number;
  send_sms: boolean;
}

interface Service {
  id: string;
  scheduled_date: string;
  service_type: {
    label: string;
    base_price: number;
    tax_rate: number;
  };
  property: {
    id: string;
    address_line1: string;
    city: string;
    state: string;
  };
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  payment_terms: number;
  tax_exempt: boolean;
  properties: Array<{
    id: string;
    address_line1: string;
    city: string;
    state: string;
  }>;
}

export const CreateInvoiceModal = ({ isOpen, onClose, onCreateInvoice, preSelectedCustomerId }: CreateInvoiceModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    customer_id: preSelectedCustomerId || '',
    property_id: '',
    service_schedule_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    payment_terms: 30,
    tax_exempt: false,
    status: 'pending',
    amount_paid: 0,
    balance: 0,
    send_sms: true
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerServices, setSelectedCustomerServices] = useState<Service[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      if (preSelectedCustomerId) {
        handleCustomerChange(preSelectedCustomerId);
      }
    } else {
      resetForm();
    }
  }, [isOpen, preSelectedCustomerId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          payment_terms,
          tax_exempt,
          properties (
            id,
            address_line1,
            city,
            state
          )
        `)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Failed to load customers');
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      property_id: '',
      service_schedule_id: ''
    }));

    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        payment_terms: customer.payment_terms,
        tax_exempt: customer.tax_exempt
      }));
    }

    try {
      console.log('Fetching services for customer:', customerId);
      const { data, error } = await supabase
        .from('service_schedules')
        .select(`
          id,
          scheduled_date,
          status,
          service_type:service_types (
            label,
            base_price,
            tax_rate
          ),
          property:properties (
            id,
            address_line1,
            city,
            state
          )
        `)
        .eq('status', 'completed')
        .eq('property.customer_id', customerId)
        .is('invoice_id', null)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      console.log('Found services:', data);
      setSelectedCustomerServices(data || []);
    } catch (err) {
      console.error('Error fetching customer services:', err);
      toast.error('Failed to load customer services');
    }
  };

  const handleInputChange = (name: keyof FormData, value: any) => {
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

    if (!formData.customer_id) newErrors.customer_id = 'Customer is required';
    if (!formData.property_id) newErrors.property_id = 'Property is required';
    if (!formData.service_schedule_id) newErrors.service_schedule_id = 'Service is required';
    if (!formData.invoice_date) newErrors.invoice_date = 'Invoice date is required';
    if (!formData.due_date) newErrors.due_date = 'Due date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      customer_id: preSelectedCustomerId || '',
      property_id: '',
      service_schedule_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      payment_terms: 30,
      tax_exempt: false,
      status: 'pending',
      amount_paid: 0,
      balance: 0,
      send_sms: true
    });
    setErrors({});
    setIsSubmitting(false);
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
      const selectedService = selectedCustomerServices.find(s => s.id === formData.service_schedule_id);
      if (!selectedService) throw new Error('Selected service not found');

      // Calculate invoice amounts
      const subtotal = selectedService.service_type.base_price;
      const taxRate = formData.tax_exempt ? 0 : selectedService.service_type.tax_rate;
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;

      // Generate invoice number (YYYYMMDD-XXX format)
      const date = new Date();
      const invoiceNumber = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          customer_id: formData.customer_id,
          property_id: formData.property_id,
          service_schedule_id: formData.service_schedule_id,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          subtotal: subtotal,
          tax_amount: taxAmount,
          total: total,
          amount_paid: 0,
          status: 'pending',
          notes: formData.notes || null,
          payment_terms: formData.payment_terms,
          tax_exempt: formData.tax_exempt
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice item
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          service_schedule_id: formData.service_schedule_id,
          description: selectedService.service_type.label,
          quantity: 1,
          unit_price: selectedService.service_type.base_price,
          tax_rate: taxRate,
          tax_amount: taxAmount
        });

      if (itemError) throw itemError;

      // Update service schedule with invoice ID
      const { error: serviceError } = await supabase
        .from('service_schedules')
        .update({ invoice_id: invoice.id })
        .eq('id', formData.service_schedule_id);

      if (serviceError) throw serviceError;

      // Send SMS notification if enabled
      if (formData.send_sms) {
        const selectedCustomer = customers.find(c => c.id === formData.customer_id);
        if (selectedCustomer?.phone) {
          try {
            // First, check if SMS sending is enabled and configured
            const { data: smsConfig, error: configError } = await supabase
              .from('message_providers')
              .select('*')
              .eq('type', 'sms')
              .eq('is_active', true)
              .single();

            if (configError || !smsConfig) {
              console.error('SMS provider not configured:', configError);
              toast.error('SMS notifications are not configured. Invoice created successfully but no SMS was sent.');
              return;
            }

            // Log the SMS attempt
            const { error: messageError } = await supabase
              .from('message_logs')
              .insert({
                provider_id: smsConfig.id,
                message_type: 'invoice_created',
                recipient: selectedCustomer.phone,
                content: `New invoice #${invoiceNumber} for $${total.toFixed(2)} has been created. Due date: ${new Date(formData.due_date).toLocaleDateString()}`,
                status: 'pending'
              });

            // Try to send the SMS
            const { error: smsError } = await supabase.rpc('send_sms', {
              p_recipient: selectedCustomer.phone,
              p_message: `New invoice #${invoiceNumber} for $${total.toFixed(2)} has been created. Due date: ${new Date(formData.due_date).toLocaleDateString()}`
            });
            
            if (smsError) {
              // Check if it's a toll-free verification error
              if (smsError.message?.includes('30032')) {
                toast.error('SMS not sent: Toll-free number requires verification. Please contact your administrator.');
                
                // Update message log with error
                await supabase
                  .from('message_logs')
                  .update({ 
                    status: 'failed',
                    error_message: 'Toll-free number requires verification'
                  })
                  .eq('provider_id', smsConfig.id)
                  .eq('recipient', selectedCustomer.phone)
                  .eq('status', 'pending');
              } else {
                console.error('Error sending SMS:', smsError);
                toast.error('Failed to send SMS notification. Invoice was created successfully.');
              }
            } else {
              // Update message log as successful
              await supabase
                .from('message_logs')
                .update({ status: 'sent' })
                .eq('provider_id', smsConfig.id)
                .eq('recipient', selectedCustomer.phone)
                .eq('status', 'pending');
            }
          } catch (smsError) {
            console.error('Error in SMS process:', smsError);
            toast.error('Failed to process SMS notification. Invoice was created successfully.');
          }
        }
      }

      await onCreateInvoice(invoice);
      
      // Navigate to invoice details with PDF view
      navigate(`/invoices/${invoice.id}/view`);
      
      toast.success('Invoice created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);
  const selectedService = selectedCustomerServices.find(s => s.id === formData.service_schedule_id);

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
                      Create Invoice
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6">
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <FormField
                            label="Customer"
                            name="customer_id"
                            value={formData.customer_id}
                            onValueChange={(name, value) => handleCustomerChange(value)}
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

                        {selectedCustomer && (
                          <div className="sm:col-span-2">
                            <FormField
                              label="Property"
                              name="property_id"
                              value={formData.property_id}
                              onValueChange={(name, value) => handleInputChange(name as keyof FormData, value)}
                              error={errors.property_id}
                              as="select"
                              options={[
                                { value: '', label: 'Select a property' },
                                ...selectedCustomer.properties.map(p => ({
                                  value: p.id,
                                  label: `${p.address_line1}, ${p.city}, ${p.state}`
                                }))
                              ]}
                            />
                          </div>
                        )}

                        {formData.property_id && selectedCustomerServices.length > 0 && (
                          <div className="sm:col-span-2">
                            <FormField
                              label="Service"
                              name="service_schedule_id"
                              value={formData.service_schedule_id}
                              onValueChange={(name, value) => handleInputChange(name as keyof FormData, value)}
                              error={errors.service_schedule_id}
                              as="select"
                              options={[
                                { value: '', label: 'Select a service' },
                                ...selectedCustomerServices
                                  .filter(s => s.property && s.property.id === formData.property_id)
                                  .map(s => ({
                                    value: s.id,
                                    label: `${s.service_type.label} - ${new Date(s.scheduled_date).toLocaleDateString()} - $${s.service_type.base_price.toFixed(2)}`
                                  }))
                              ]}
                            />
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <FormField
                            label="Invoice Date"
                            name="invoice_date"
                            type="date"
                            value={formData.invoice_date}
                            onValueChange={(name, value) => handleInputChange(name as keyof FormData, value)}
                            error={errors.invoice_date}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormField
                            label="Due Date"
                            name="due_date"
                            type="date"
                            value={formData.due_date}
                            onValueChange={(name, value) => handleInputChange(name as keyof FormData, value)}
                            error={errors.due_date}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormField
                            label="Payment Terms (Days)"
                            name="payment_terms"
                            type="number"
                            value={formData.payment_terms.toString()}
                            onValueChange={(name, value) => handleInputChange(name as keyof FormData, parseInt(value) || 30)}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormField
                            label="Tax Exempt"
                            name="tax_exempt"
                            type="checkbox"
                            value={formData.tax_exempt ? "true" : "false"}
                            onValueChange={(name, value) => handleInputChange(name as keyof FormData, value === "true")}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormField
                            label="Send SMS Notification"
                            name="send_sms"
                            type="checkbox"
                            value={formData.send_sms ? "true" : "false"}
                            onValueChange={(name, value) => handleInputChange(name as keyof FormData, value === "true")}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormField
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onValueChange={(name, value) => handleInputChange(name as keyof FormData, value)}
                            as="textarea"
                            required={false}
                          />
                        </div>

                        {selectedService && (
                          <div className="sm:col-span-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                            <h4 className="font-medium text-gray-900 dark:text-white">Invoice Summary</h4>
                            <div className="mt-2 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  ${selectedService.service_type.base_price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Tax ({formData.tax_exempt ? '0' : selectedService.service_type.tax_rate}%):
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  ${formData.tax_exempt ? '0.00' : ((selectedService.service_type.base_price * selectedService.service_type.tax_rate) / 100).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                                <span className="font-medium text-gray-900 dark:text-white">Total:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  ${(selectedService.service_type.base_price * (1 + (formData.tax_exempt ? 0 : selectedService.service_type.tax_rate / 100))).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
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
                          {isSubmitting ? 'Creating...' : 'Create Invoice'}
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