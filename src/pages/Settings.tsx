import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tab } from '@headlessui/react';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  KeyIcon,
  ShieldCheckIcon,
  BellIcon,
  Cog6ToothIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useSupabase } from '../hooks/useSupabase';
import { toast } from 'react-hot-toast';
import { Icon } from '../components/ui/Icon';

interface UserProfile {
  id: string;
  user_id: string;
  role: 'admin' | 'technician' | 'office_staff';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const Settings = () => {
  const { supabase, user } = useSupabase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      if (profile?.role === 'admin') {
        fetchAllUsers();
      }
    }
  }, [user, profile?.role]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || ''
      });
    } catch (err) {
      console.error('Error fetching user profile:', err);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchUserProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      toast.success('Password reset email sent');
    } catch (err) {
      console.error('Error sending password reset:', err);
      toast.error('Failed to send password reset email');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'technician' | 'office_staff') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User role updated successfully');
      fetchAllUsers();
    } catch (err) {
      console.error('Error updating user role:', err);
      toast.error('Failed to update user role');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !isActive })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
      fetchAllUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <Tab.Group>
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
              <Icon icon={UserIcon} className="mr-2" />
              Profile
            </div>
          </Tab>
          {profile?.role === 'admin' && (
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
                <Icon icon={UsersIcon} className="mr-2" />
                User Management
              </div>
            </Tab>
          )}
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
              <Icon icon={Cog6ToothIcon} className="mr-2" />
              Preferences
            </div>
          </Tab>
        </Tab.List>

        <Tab.Panels>
          {/* Profile Panel */}
          <Tab.Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Profile Information */}
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Profile Information
                    </h2>
                    {!isEditing && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsEditing(true)}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        Edit Profile
                      </motion.button>
                    )}
                  </div>
                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          First Name
                        </label>
                        <input
                          type="text"
                          id="first_name"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Last Name
                        </label>
                        <input
                          type="text"
                          id="last_name"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Phone
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          Save Changes
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="inline-flex items-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {profile?.first_name} {profile?.last_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Email:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{profile?.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{profile?.phone || 'Not set'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Role:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {profile?.role.charAt(0).toUpperCase() + profile?.role.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Settings */}
                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Security Settings
                  </h2>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <KeyIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Password</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handlePasswordReset}
                        className="inline-flex items-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        Reset Password
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Account Status
                  </h2>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`h-3 w-3 rounded-full ${profile?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-gray-600 dark:text-gray-400">Status</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {profile?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Member Since</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(profile?.created_at || '').toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(profile?.updated_at || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* User Management Panel (Admin Only) */}
          {profile?.role === 'admin' && (
            <Tab.Panel>
              <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    User Management
                  </h2>
                  <div className="mt-6">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead>
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                User
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map((user) => (
                              <tr key={user.id}>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {user.first_name} {user.last_name}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {user.email}
                                    </div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <select
                                    value={user.role}
                                    onChange={(e) => handleUpdateUserRole(user.user_id, e.target.value as 'admin' | 'technician' | 'office_staff')}
                                    className="rounded-lg border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="technician">Technician</option>
                                    <option value="office_staff">Office Staff</option>
                                  </select>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                    user.is_active
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  }`}>
                                    {user.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleToggleUserStatus(user.user_id, user.is_active)}
                                    className={`rounded-lg px-3 py-1 text-sm font-medium ${
                                      user.is_active
                                        ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40'
                                    }`}
                                  >
                                    {user.is_active ? 'Deactivate' : 'Activate'}
                                  </motion.button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Tab.Panel>
          )}

          {/* Preferences Panel */}
          <Tab.Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Notification Settings */}
              <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                <div className="flex items-center space-x-2">
                  <Icon icon={BellIcon} className="text-gray-400" />
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Notification Settings
                  </h2>
                </div>
                <div className="mt-6 space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Email notifications
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      SMS notifications
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Push notifications
                    </span>
                  </label>
                </div>
              </div>

              {/* Display Settings */}
              <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                <div className="flex items-center space-x-2">
                  <Icon icon={Cog6ToothIcon} className="text-gray-400" />
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Display Settings
                  </h2>
                </div>
                <div className="mt-6 space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Dark mode
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Compact view
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}; 