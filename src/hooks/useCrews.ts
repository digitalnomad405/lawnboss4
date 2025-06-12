import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import type { Crew, CrewMember, CrewAssignment } from '../types/crew';
import { toast } from 'react-hot-toast';

export const useCrews = () => {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [crewAssignments, setCrewAssignments] = useState<CrewAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { supabase } = useSupabase();

  const fetchCrews = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crews')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCrews(data || []);
    } catch (err) {
      console.error('Error fetching crews:', err);
      setError(err as Error);
    }
  }, [supabase]);

  const fetchCrewMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crew_members')
        .select(`
          *,
          technician:technicians (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCrewMembers(data || []);
    } catch (err) {
      console.error('Error fetching crew members:', err);
      setError(err as Error);
    }
  }, [supabase]);

  const fetchCrewAssignments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crew_assignments')
        .select(`
          *,
          crew:crews (*),
          service_schedule:service_schedules (
            scheduled_date,
            scheduled_time_window,
            property:properties (
              address_line1,
              city,
              state
            ),
            service_type:service_types (
              label
            )
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setCrewAssignments(data || []);
    } catch (err) {
      console.error('Error fetching crew assignments:', err);
      setError(err as Error);
    }
  }, [supabase]);

  const addCrew = async (crewData: Pick<Crew, 'name' | 'description'>) => {
    try {
      const { data, error } = await supabase
        .from('crews')
        .insert([{
          ...crewData,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchCrews();
      return data;
    } catch (err) {
      console.error('Error adding crew:', err);
      throw err;
    }
  };

  const addCrewMember = async (memberData: {
    crew_id: string;
    technician_id: string;
    role: CrewMember['role'];
    is_primary_crew?: boolean;
    start_date?: string;
  }) => {
    try {
      console.log('Adding crew member with data:', memberData);
      const { data, error } = await supabase
        .from('crew_members')
        .insert([{
          ...memberData,
          is_primary_crew: memberData.is_primary_crew || false,
          start_date: memberData.start_date || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding crew member:', error);
        throw error;
      }
      console.log('Successfully added crew member:', data);
      await fetchCrewMembers();
      return data;
    } catch (err) {
      console.error('Error adding crew member:', err);
      throw err;
    }
  };

  const assignCrew = async (assignmentData: {
    crew_id: string;
    service_schedule_id: string;
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('crew_assignments')
        .insert([{
          ...assignmentData,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchCrewAssignments();
      return data;
    } catch (err) {
      console.error('Error assigning crew:', err);
      throw err;
    }
  };

  const updateCrewStatus = async (crewId: string, status: Crew['status']) => {
    try {
      const { error } = await supabase
        .from('crews')
        .update({ status })
        .eq('id', crewId);

      if (error) throw error;
      await fetchCrews();
    } catch (err) {
      console.error('Error updating crew status:', err);
      throw err;
    }
  };

  const updateCrewMember = async (
    memberId: string,
    updates: Partial<Pick<CrewMember, 'role' | 'is_primary_crew' | 'end_date'>>
  ) => {
    try {
      const { error } = await supabase
        .from('crew_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;
      await fetchCrewMembers();
    } catch (err) {
      console.error('Error updating crew member:', err);
      throw err;
    }
  };

  const updateAssignmentStatus = async (
    assignmentId: string,
    status: CrewAssignment['status']
  ) => {
    try {
      const { error } = await supabase
        .from('crew_assignments')
        .update({ status })
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchCrewAssignments();
    } catch (err) {
      console.error('Error updating assignment status:', err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchCrews(),
          fetchCrewMembers(),
          fetchCrewAssignments()
        ]);
      } catch (err) {
        console.error('Error fetching crew data:', err);
        setError(err as Error);
        toast.error('Failed to load crew data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up subscriptions
    const crewsSubscription = supabase
      .channel('crews_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crews' }, fetchCrews)
      .subscribe();

    const membersSubscription = supabase
      .channel('crew_members_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_members' }, fetchCrewMembers)
      .subscribe();

    const assignmentsSubscription = supabase
      .channel('crew_assignments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_assignments' }, fetchCrewAssignments)
      .subscribe();

    // Cleanup subscriptions
    return () => {
      crewsSubscription.unsubscribe();
      membersSubscription.unsubscribe();
      assignmentsSubscription.unsubscribe();
    };
  }, [fetchCrews, fetchCrewMembers, fetchCrewAssignments, supabase]);

  return {
    crews,
    crewMembers,
    crewAssignments,
    loading,
    error,
    addCrew,
    addCrewMember,
    assignCrew,
    updateCrewStatus,
    updateCrewMember,
    updateAssignmentStatus
  };
}; 