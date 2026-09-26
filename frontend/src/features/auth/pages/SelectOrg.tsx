import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchApi } from '../../../services/api';
import { supabase } from '../../../utils/supabase';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export const SelectOrg = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { setActiveOrganization } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const data = await fetchApi('/api/organizations');
        setOrgs(data);
      } catch (error) {
        console.error('Failed to load orgs', error);
      } finally {
        setLoading(false);
      }
    };
    loadOrgs();
  }, []);

  const handleSelect = (org: Organization) => {
    setActiveOrganization(org);
    navigate('/app/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">Select Organization</h2>
        
        {orgs.length === 0 ? (
          <p className="text-gray-500">You do not belong to any organizations.</p>
        ) : (
          <div className="space-y-4">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org)}
                className="w-full flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900">{org.name}</p>
                  <p className="text-sm text-gray-500">{org.role}</p>
                </div>
                <span className="text-blue-600 font-medium text-sm">Select &rarr;</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
