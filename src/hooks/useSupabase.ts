import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, subscriptionManager, type Customer, type Property } from '../lib/supabase';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';

interface ServiceType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  tax_rate: number;
  unit_type: 'flat_rate' | 'per_sqft' | 'per_yard';
}

export const useSupabase = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // Use refs to store the latest data to prevent unnecessary re-renders
  const customersRef = useRef(customers);
  const propertiesRef = useRef(properties);
  const serviceTypesRef = useRef(serviceTypes);

  // Update refs when state changes
  useEffect(() => {
    customersRef.current = customers;
    propertiesRef.current = properties;
    serviceTypesRef.current = serviceTypes;
  }, [customers, properties, serviceTypes]);

  // Get and set the initial user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Debounced state updates
  const debouncedSetCustomers = useCallback(
    debounce((newCustomers: Customer[]) => {
      setCustomers(prev => {
        // Only update if there are actual changes
        if (JSON.stringify(prev) !== JSON.stringify(newCustomers)) {
          return newCustomers;
        }
        return prev;
      });
    }, 100),
    []
  );

  const debouncedSetProperties = useCallback(
    debounce((newProperties: Property[]) => {
      setProperties(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newProperties)) {
          return newProperties;
        }
        return prev;
      });
    }, 100),
    []
  );

  const debouncedSetServiceTypes = useCallback(
    debounce((newServiceTypes: ServiceType[]) => {
      setServiceTypes(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newServiceTypes)) {
          return newServiceTypes;
        }
        return prev;
      });
    }, 100),
    []
  );

  // Memoized fetch functions
  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        debouncedSetCustomers(data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err as Error);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        debouncedSetProperties(data);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(err as Error);
    }
  }, []);

  const fetchServiceTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) {
        debouncedSetServiceTypes(data);
      }
    } catch (err) {
      console.error('Error fetching service types:', err);
      setError(err as Error);
    }
  }, []);

  // Add a new customer and their initial property
  const addCustomer = async (customerData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    billing_address: string;
    billing_city: string;
    billing_state: string;
    billing_zip: string;
  }): Promise<string> => {
    try {
      // Check if email already exists
      const { data: existingCustomers, error: checkError } = await supabase
        .from('customers')
        .select('id, email')
        .eq('email', customerData.email);

      if (checkError) throw checkError;
      
      if (existingCustomers && existingCustomers.length > 0) {
        throw new Error('A customer with this email already exists');
      }

      // Insert customer
      const { data: customerResult, error: customerError } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          status: 'active',
          payment_terms: 30, // Default payment terms
          tax_exempt: false
        }])
        .select()
        .single();

      if (customerError) {
        if (customerError.code === '23505') { // PostgreSQL unique constraint violation
          throw new Error('A customer with this email already exists');
        }
        console.error('Error adding customer:', customerError);
        throw new Error(customerError.message);
      }

      if (!customerResult) {
        throw new Error('No customer data returned after insert');
      }

      // Insert property using customer data
      const { error: propertyError } = await supabase
        .from('properties')
        .insert([{
          customer_id: customerResult.id,
          address_line1: customerData.billing_address,
          city: customerData.billing_city,
          state: customerData.billing_state,
          zip_code: customerData.billing_zip,
          has_irrigation: false,
          has_pets: false
        }]);

      if (propertyError) {
        console.error('Error adding property:', propertyError);
        // Delete the customer since property creation failed
        await supabase
          .from('customers')
          .delete()
          .eq('id', customerResult.id);
        throw new Error(propertyError.message);
      }

      // Refresh data
      await Promise.all([fetchCustomers(), fetchProperties()]);
      toast.success('Customer added successfully!');
      
      return customerResult.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error in addCustomer:', errorMessage);
      toast.error(`Failed to add customer: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  };

  // Add a new property
  const addProperty = async (propertyData: {
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
  }) => {
    try {
      // Validate required fields
      if (!propertyData.customer_id) throw new Error('Customer ID is required');
      if (!propertyData.address_line1) throw new Error('Address is required');
      if (!propertyData.city) throw new Error('City is required');
      if (!propertyData.state) throw new Error('State is required');
      if (!propertyData.zip_code) throw new Error('ZIP code is required');

      // Clean up the data before insertion
      const cleanedData = {
        ...propertyData,
        property_size: propertyData.property_size || null,
        lawn_size: propertyData.lawn_size || null,
        has_irrigation: Boolean(propertyData.has_irrigation),
        has_pets: Boolean(propertyData.has_pets)
      };

      const { data, error } = await supabase
        .from('properties')
        .insert([cleanedData])
        .select('id')
        .single();

      if (error) {
        console.error('Supabase error adding property:', error);
        if (error.code === '23505') {
          throw new Error('A property with this address already exists');
        }
        throw new Error(error.message);
      }

      if (!data?.id) {
        throw new Error('No property ID returned from insert');
      }

      // Refresh properties list
      await fetchProperties();
      
      toast.success('Property added successfully!');
      return data.id;
    } catch (err) {
      console.error('Error adding property:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(`Failed to add property: ${errorMessage}`);
      throw err;
    }
  };

  const refetch = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCustomers(), fetchProperties(), fetchServiceTypes()]);
    } catch (err) {
      console.error('Error refetching data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch and subscription setup
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCustomers(), fetchProperties(), fetchServiceTypes()]);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Debounced subscription handlers
    const handleCustomersChange = debounce(() => {
      if (isMounted) fetchCustomers();
    }, 100);

    const handlePropertiesChange = debounce(() => {
      if (isMounted) fetchProperties();
    }, 100);

    const handleServiceTypesChange = debounce(() => {
      if (isMounted) fetchServiceTypes();
    }, 100);

    // Set up subscriptions using the subscription manager
    const customersCleanup = subscriptionManager.subscribe('customers_changes', handleCustomersChange);
    const propertiesCleanup = subscriptionManager.subscribe('properties_changes', handlePropertiesChange);
    const serviceTypesCleanup = subscriptionManager.subscribe('service_types_changes', handleServiceTypesChange);

    // Cleanup function
    return () => {
      isMounted = false;
      customersCleanup();
      propertiesCleanup();
      serviceTypesCleanup();
      handleCustomersChange.cancel();
      handlePropertiesChange.cancel();
      handleServiceTypesChange.cancel();
    };
  }, [fetchCustomers, fetchProperties, fetchServiceTypes]);

  return {
    customers,
    properties,
    serviceTypes,
    loading,
    error,
    user,
    addCustomer,
    addProperty,
    fetchCustomers,
    fetchProperties,
    fetchServiceTypes,
    refetch,
    supabase
  };
}; 