import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InboxIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { useSupabase } from '../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PhoneNumber } from '../components/ui/PhoneNumber';
import { Tab } from '@headlessui/react';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Message {
  id: string;
  type: 'email' | 'sms';
  subject?: string;
  content: string;
  sent_by: string;
  sent_at: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  recipients: Array<{
    id: string;
    customer: {
      first_name: string;
      last_name: string;
      email?: string;
      phone?: string;
    };
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    sent_at: string;
    delivered_at?: string;
    error_message?: string;
  }>;
}

interface MessageFormData {
  recipients: string[];
  subject: string;
  message: string;
  sendEmail: boolean;
  sendSMS: boolean;
}

const INITIAL_FORM_DATA: MessageFormData = {
  recipients: [],
  subject: '',
  message: '',
  sendEmail: true,
  sendSMS: false,
};

const MessagesList = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<MessageFormData>(INITIAL_FORM_DATA);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchMessages();
    }
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err as Error);
      toast.error('Failed to load customers');
    }
  };

  const fetchMessages = async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('messages')
        .select(`
          id,
          type,
          subject,
          content,
          sent_by,
          sent_at,
          status,
          recipients:message_recipients (
            id,
            status,
            sent_at,
            delivered_at,
            error_message,
            customer:customers (
              first_name,
              last_name,
              email,
              phone
            )
          )
        `)
        .order('sent_at', { ascending: false });

      if (activeTab === 0) {
        query = query.neq('sent_by', user.id);
      } else if (activeTab === 1) {
        query = query.eq('sent_by', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab < 2 && user?.id) {
      fetchMessages();
    }
  }, [activeTab, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    if (!formData.recipients.length) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (formData.sendEmail && !formData.subject.trim()) {
      toast.error('Please enter a subject for email');
      return;
    }

    try {
      setSending(true);

      const selectedCustomers = customers.filter(c => formData.recipients.includes(c.id));
      
      // Send emails
      if (formData.sendEmail) {
        for (const customer of selectedCustomers) {
          if (!customer.email) continue;

          const { error: emailError } = await supabase.functions.invoke('send-custom-email', {
            body: {
              to: customer.email,
              subject: formData.subject,
              message: formData.message,
              customerName: `${customer.first_name} ${customer.last_name}`
            }
          });

          if (emailError) throw emailError;
        }
      }

      // Send SMS
      if (formData.sendSMS) {
        for (const customer of selectedCustomers) {
          if (!customer.phone) continue;

          const { error: smsError } = await supabase.functions.invoke('send-custom-sms', {
            body: {
              to: customer.phone,
              message: formData.message
            }
          });

          if (smsError) throw smsError;
        }
      }

      toast.success('Messages sent successfully!');
      setFormData(INITIAL_FORM_DATA);
      fetchMessages(); // Refresh messages list
    } catch (err) {
      console.error('Error sending messages:', err);
      toast.error('Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm) ||
      (customer.email || '').toLowerCase().includes(searchTerm) ||
      (customer.phone || '').includes(searchTerm)
    );
  });

  const filteredMessages = messages.filter(message => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      message.subject?.toLowerCase().includes(searchTerm) ||
      message.content.toLowerCase().includes(searchTerm) ||
      message.recipients.some(r => 
        `${r.customer.first_name} ${r.customer.last_name}`.toLowerCase().includes(searchTerm) ||
        (r.customer.email || '').toLowerCase().includes(searchTerm) ||
        (r.customer.phone || '').includes(searchTerm)
      )
    );
  });

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Please sign in to access messages
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You need to be signed in to view and send messages.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Messages</h1>
      </div>

      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-primary-900/20 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-white text-primary-700 shadow dark:bg-gray-800 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-white dark:text-gray-400'
              }`
            }
          >
            <div className="flex items-center justify-center">
              <Icon icon={InboxIcon} className="mr-2" />
              Inbox
            </div>
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-white text-primary-700 shadow dark:bg-gray-800 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-white dark:text-gray-400'
              }`
            }
          >
            <div className="flex items-center justify-center">
              <Icon icon={PaperAirplaneIcon} className="mr-2" />
              Sent
            </div>
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-white text-primary-700 shadow dark:bg-gray-800 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-white dark:text-gray-400'
              }`
            }
          >
            <div className="flex items-center justify-center">
              <Icon icon={PlusIcon} className="mr-2" />
              Compose
            </div>
          </Tab>
        </Tab.List>

        <Tab.Panels>
          {/* Inbox Panel */}
          <Tab.Panel>
            <div className="space-y-6">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No messages found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className="cursor-pointer p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                  {message.subject || 'SMS Message'}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  {message.content}
                                </p>
                              </div>
                              <div className="ml-4 flex flex-col items-end">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(message.sent_at).toLocaleDateString()}
                                </span>
                                <span className={`mt-1 text-sm ${
                                  message.status === 'delivered' 
                                    ? 'text-green-600 dark:text-green-400'
                                    : message.status === 'failed'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-yellow-600 dark:text-yellow-400'
                                }`}>
                                  {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Recipients:</h4>
                              <div className="mt-2 space-y-2">
                                {message.recipients.map((recipient) => (
                                  <div key={recipient.id} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <span className="text-sm text-gray-900 dark:text-white">
                                        {recipient.customer.first_name} {recipient.customer.last_name}
                                      </span>
                                      {recipient.customer.email && (
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                          ({recipient.customer.email})
                                        </span>
                                      )}
                                      {recipient.customer.phone && (
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                          (<PhoneNumber number={recipient.customer.phone} />)
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-sm ${
                                      recipient.status === 'delivered'
                                        ? 'text-green-600 dark:text-green-400'
                                        : recipient.status === 'failed'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-yellow-600 dark:text-yellow-400'
                                    }`}>
                                      {recipient.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>

          {/* Sent Panel */}
          <Tab.Panel>
            <div className="space-y-6">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search sent messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No sent messages found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className="cursor-pointer p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                  {message.subject || 'SMS Message'}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  {message.content}
                                </p>
                              </div>
                              <div className="ml-4 flex flex-col items-end">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(message.sent_at).toLocaleDateString()}
                                </span>
                                <span className={`mt-1 text-sm ${
                                  message.status === 'delivered' 
                                    ? 'text-green-600 dark:text-green-400'
                                    : message.status === 'failed'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-yellow-600 dark:text-yellow-400'
                                }`}>
                                  {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Recipients:</h4>
                              <div className="mt-2 space-y-2">
                                {message.recipients.map((recipient) => (
                                  <div key={recipient.id} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <span className="text-sm text-gray-900 dark:text-white">
                                        {recipient.customer.first_name} {recipient.customer.last_name}
                                      </span>
                                      {recipient.customer.email && (
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                          ({recipient.customer.email})
                                        </span>
                                      )}
                                      {recipient.customer.phone && (
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                          (<PhoneNumber number={recipient.customer.phone} />)
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-sm ${
                                      recipient.status === 'delivered'
                                        ? 'text-green-600 dark:text-green-400'
                                        : recipient.status === 'failed'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-yellow-600 dark:text-yellow-400'
                                    }`}>
                                      {recipient.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>

          {/* Compose Panel */}
          <Tab.Panel>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Message Form */}
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Send Message</h2>
                  <form onSubmit={handleSendMessage} className="mt-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Send via
                      </label>
                      <div className="mt-2 flex space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.sendEmail}
                            onChange={(e) => setFormData(prev => ({ ...prev, sendEmail: e.target.checked }))}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Email</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.sendSMS}
                            onChange={(e) => setFormData(prev => ({ ...prev, sendSMS: e.target.checked }))}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">SMS</span>
                        </label>
                      </div>
                    </div>

                    {formData.sendEmail && (
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Subject
                        </label>
                        <input
                          type="text"
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter email subject"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter your message"
                      />
                    </div>

                    <div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={sending}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {sending ? (
                          <>
                            <Icon icon={ClockIcon} className="mr-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Icon icon={PaperAirplaneIcon} className="mr-2" />
                            Send Message
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Recipients Selection */}
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recipients</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formData.recipients.length} selected
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="mt-6 max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        No customers found
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredCustomers.map((customer) => (
                          <label
                            key={customer.id}
                            className="flex cursor-pointer items-center py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <input
                              type="checkbox"
                              checked={formData.recipients.includes(customer.id)}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  recipients: e.target.checked
                                    ? [...prev.recipients, customer.id]
                                    : prev.recipients.filter(id => id !== customer.id)
                                }));
                              }}
                              className="ml-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
                            />
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {customer.first_name} {customer.last_name}
                                  </p>
                                  {customer.email && (
                                    <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                      <Icon icon={EnvelopeIcon} className="mr-1.5" size="sm" />
                                      {customer.email}
                                    </p>
                                  )}
                                  {customer.phone && (
                                    <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                      <Icon icon={DevicePhoneMobileIcon} className="mr-1.5" size="sm" />
                                      <PhoneNumber number={customer.phone} />
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export const Messages = () => {
  return (
    <ErrorBoundary>
      <MessagesList />
    </ErrorBoundary>
  );
}; 