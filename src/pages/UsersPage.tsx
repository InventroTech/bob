import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
import { useNavigate } from 'react-router-dom';
import { membershipService, User } from '@/lib/api';



const UsersPage = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);


  // Fetch users using centralized membership service
  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.access_token) return;

      try {
        const usersData = await membershipService.getUsers();
        setUsers(usersData);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        toast.error(`Failed to fetch users: ${error.message || 'An unexpected error occurred'}`);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div>Loading users...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h5>Users</h5>
          <CustomButton onClick={() => navigate('/add-user')}>
            Add New User
          </CustomButton>
        </div>

        <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-black border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.role?.name || 'No Role'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(user.created_at)}</div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage; 