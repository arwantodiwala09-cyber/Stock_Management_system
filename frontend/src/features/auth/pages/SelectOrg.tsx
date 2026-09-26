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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { setActiveOrganization } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const data = await fetchApi('/api/organizations');
        setOrgs(data);
      } catch (error) {
        console.error('Failed to load orgs', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load organizations.');
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

  const handleCreateOrganization = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = organizationName.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (slug.length < 2) {
      setCreateError('Organization name must contain at least two letters or numbers.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const organization = await fetchApi<Omit<Organization, 'role'>>('/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      });
      handleSelect({ ...organization, role: 'Organization Admin' });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create organization.');
    } finally {
      setCreating(false);
    }
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
        
        {loadError ? (
          <div role="alert" className="space-y-3 text-sm text-red-700">
            <p>Unable to load organizations: {loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Retry
            </button>
          </div>
        ) : orgs.length === 0 ? (
          <div className="space-y-4">
            <p className="text-gray-500">You do not belong to any organizations.</p>
            <form className="space-y-3 text-left" onSubmit={handleCreateOrganization}>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                id="organizationName"
                type="text"
                required
                minLength={2}
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating organization...' : 'Create organization'}
              </button>
            </form>
          </div>
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
