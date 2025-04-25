import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function Profile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [program, setProgram] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoadingProfile(true);
        
        if (!user) return;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setFullName(data.full_name || '');
          setProgram(data.program || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName) {
      setError('Full name is required');
      return;
    }
    
    try {
      setError('');
      setSuccess(false);
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          program: program,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-green-700">Profile updated successfully!</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="label">
              Email (cannot be changed)
            </label>
            <input
              id="email"
              type="email"
              className="input bg-gray-50"
              value={user?.email || ''}
              disabled
            />
          </div>
          
          <div>
            <label htmlFor="fullName" className="label">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label htmlFor="program" className="label">
              Program/Course
            </label>
            <input
              id="program"
              type="text"
              className="input"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g., Computer Science, Business Administration"
            />
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 card bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Account created</span>
            <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Target OJT hours</span>
            <span>500 hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile; 