import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

// Type definitions for our database tables
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name?: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  payment_terms: number;
  tax_exempt: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  referral_source?: string;
}

export interface Property {
  id: string;
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
  created_at: string;
  updated_at: string;
  customers?: Customer;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  tax_rate: number;
  unit_type: 'flat_rate' | 'per_sqft' | 'per_yard';
  created_at: string;
  updated_at: string;
}

// Subscription manager to handle realtime subscriptions
class SubscriptionManager {
  private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  subscribe(channelName: string, callback: () => void) {
    // If channel doesn't exist, create it
    if (!this.channels.has(channelName)) {
      const channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
      this.listeners.set(channelName, new Set());

      // Set up the channel subscription
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: channelName.replace('_changes', '')
          },
          () => {
            // Notify all listeners for this channel
            this.listeners.get(channelName)?.forEach(listener => listener());
          }
        )
        .subscribe();
    }

    // Add the callback to listeners
    this.listeners.get(channelName)?.add(callback);

    // Return cleanup function
    return () => {
      const listeners = this.listeners.get(channelName);
      if (listeners) {
        listeners.delete(callback);
        
        // If no more listeners, clean up the channel
        if (listeners.size === 0) {
          const channel = this.channels.get(channelName);
          if (channel) {
            channel.unsubscribe();
            this.channels.delete(channelName);
            this.listeners.delete(channelName);
          }
        }
      }
    };
  }
}

export const subscriptionManager = new SubscriptionManager(); 