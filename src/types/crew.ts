export type CrewRole = 'crew_leader' | 'crew_member' | 'trainee';

export type Crew = {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type CrewMember = {
  id: string;
  crew_id: string;
  technician_id: string;
  role: CrewRole;
  is_primary_crew: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  technician?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
};

export type CrewAssignment = {
  id: string;
  crew_id: string;
  service_schedule_id: string;
  assigned_at: string;
  assigned_by: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  crew?: Crew;
  service_schedule?: {
    scheduled_date: string;
    scheduled_time_window: string;
    property: {
      address_line1: string;
      city: string;
      state: string;
    };
    service_type: {
      label: string;
    };
  };
};

const crewTypes = {
  Crew,
  CrewMember,
  CrewAssignment,
  CrewRole
};

export default crewTypes; 