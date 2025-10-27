import { supabase } from '@/lib/supabase';
import { 
  UserSettings, 
  UserSettingsCreate, 
  UserSettingsUpdate,
  LeadTypeAssignment,
  LeadTypeAssignmentRequest,
  UserLeadTypes,
  LeadTypeAssignmentResponse
} from '../types/userSettings';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// User Settings API functions
export const userSettingsApi = {
  // Get all user settings for the current tenant
  async getAll(): Promise<UserSettings[]> {
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user settings: ${response.statusText}`);
    }

    return response.json();
  },

  // Create or update a user setting
  async createOrUpdate(data: UserSettingsCreate): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create/update user setting: ${response.statusText}`);
    }

    return response.json();
  },

  // Get a specific user setting
  async get(userId: string, key: string): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/${userId}/${key}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user setting: ${response.statusText}`);
    }

    return response.json();
  },

  // Update a specific user setting
  async update(userId: string, key: string, data: UserSettingsUpdate): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/${userId}/${key}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user setting: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete a specific user setting
  async delete(userId: string, key: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/${userId}/${key}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user setting: ${response.statusText}`);
    }
  },
};

// Lead Type Assignment API functions
export const leadTypeAssignmentApi = {
  // Get all lead type assignments for the tenant (GM only)
  async getAll(): Promise<LeadTypeAssignment[]> {
    console.log('Fetching RMs from Supabase database...');
    
    try {
      // Use direct Supabase query to see all available fields
      const { data: allUsers, error } = await supabase
        .from('users' as any)
        .select('id, name, email, role_id, uid');

      console.log('All users data:', allUsers);
      console.log('Sample user structure:', allUsers?.[0]);

      // Get RM role ID first
      const { data: rmRole, error: roleError } = await supabase
        .from('roles' as any)
        .select('id')
        .eq('name', 'RM')
        .single();

      if (roleError) {
        console.error('Error fetching RM role:', roleError);
        throw new Error(`Failed to fetch RM role: ${roleError.message}`);
      }

      // Filter for RMs only using role_id
      const rmUsers = (allUsers || []).filter((user: any) => user.role_id === rmRole?.id);

      console.log('RM users found:', rmUsers.length);
      console.log('RM users data:', rmUsers);

      // Get existing lead type assignments from user_settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('user_id, value')
        .eq('key', 'LEAD_TYPE_ASSIGNMENT');

      if (settingsError) {
        console.error('Error fetching lead type assignments:', settingsError);
        // Continue without assignments - they'll be empty
      }

      // Create a map of user UUID to lead_types
      const assignmentsMap = new Map();
      if (settings) {
        settings.forEach((setting: any) => {
          assignmentsMap.set(setting.user_id, setting.value || []);
        });
      }

      // Transform to LeadTypeAssignment format
      const assignments: LeadTypeAssignment[] = rmUsers.map((user: any) => {
        return {
          user_id: user.id, // Keep using the integer ID for the component
          user_name: user.name || 'Unknown',
          user_email: user.email,
          lead_types: user.uid ? assignmentsMap.get(user.uid) || [] : []
        };
      });

      return assignments;
    } catch (error: any) {
      console.error('Error in getAll:', error);
      throw error;
    }
  },

  // Assign lead types to a user (GM only)
  async assign(data: LeadTypeAssignmentRequest): Promise<LeadTypeAssignmentResponse> {
    console.log('Saving lead type assignment to Supabase...');
    
    try {
      // Get the user data including tenant_id and uid
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id, uid, id')
        .eq('id', data.user_id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        console.error('Looking for user with id:', data.user_id);
        throw new Error(`Failed to get user data: ${userError?.message || 'User not found'}`);
      }

      console.log('User data:', userData);
      
      if (!userData.uid) {
        console.error('No uid found for user:', data.user_id);
        console.error('Available fields:', Object.keys(userData));
        throw new Error('User UUID not found - uid field is missing');
      }

      console.log('Using uid:', userData.uid);
      
      // Check if the setting already exists
      const { data: existingSetting, error: checkError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userData.uid)
        .eq('key', 'LEAD_TYPE_ASSIGNMENT')
        .eq('tenant_id', userData.tenant_id)
        .single();

      let result, error;

      if (existingSetting) {
        // Update existing setting
        const { data: updateResult, error: updateError } = await supabase
          .from('user_settings')
          .update({
            value: data.lead_types,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSetting.id);
        
        result = updateResult;
        error = updateError;
      } else {
        // Insert new setting
        const { data: insertResult, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userData.uid,
            key: 'LEAD_TYPE_ASSIGNMENT',
            value: data.lead_types,
            tenant_id: userData.tenant_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        result = insertResult;
        error = insertError;
      }

      if (error) {
        console.error('Error saving lead type assignment:', error);
        throw new Error(`Failed to save lead type assignment: ${error.message}`);
      }

      console.log('Lead type assignment saved successfully:', result);

      // Get user name for response
      const { data: userNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', data.user_id)
        .single();

      // Return the assignment data
      return {
        user_id: data.user_id,
        user_name: userNameData?.name || 'Unknown',
        lead_types: data.lead_types,
        created: true
      };
    } catch (error: any) {
      console.error('Error in assign:', error);
      throw error;
    }
  },

  // Get lead types assigned to a specific user
  async getUserLeadTypes(userId: string): Promise<UserLeadTypes> {
    try {
      // Get the user's uid first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('uid')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
      }

      if (!userData.uid) {
        throw new Error('User UUID not found - uid field is missing');
      }

      // Get lead types from user_settings using the uid
      const { data: setting, error: settingError } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', userData.uid)
        .eq('key', 'LEAD_TYPE_ASSIGNMENT')
        .single();

      if (settingError && settingError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to fetch lead types: ${settingError.message}`);
      }

      return {
        user_id: userId,
        lead_types: setting?.value || []
      };
    } catch (error: any) {
      console.error('Error in getUserLeadTypes:', error);
      throw error;
    }
  },
};
