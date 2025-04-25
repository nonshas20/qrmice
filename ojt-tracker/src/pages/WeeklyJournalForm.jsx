import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function WeeklyJournalForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journalText, setJournalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingJournal, setExistingJournal] = useState(null);
  const [weekDates, setWeekDates] = useState({ start: null, end: null });

  // Get the current ISO week's Monday
  const getCurrentWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Get the end date of the week (Sunday)
  const getWeekEnd = (weekStart) => {
    const sunday = new Date(weekStart);
    sunday.setDate(sunday.getDate() + 6);
    return sunday;
  };

  useEffect(() => {
    const weekStart = getCurrentWeekStart();
    const weekEnd = getWeekEnd(weekStart);
    
    setWeekDates({
      start: weekStart,
      end: weekEnd
    });

    // Check if there's an existing journal for this week
    async function checkExistingJournal() {
      try {
        setLoadingData(true);
        
        const { data, error } = await supabase
          .from('weekly_journals')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_start_date', weekStart.toISOString().split('T')[0])
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 means not found
          throw error;
        }
        
        if (data) {
          setExistingJournal(data);
          setJournalText(data.journal_text);
        }
      } catch (error) {
        console.error('Error checking for existing journal:', error);
        setError('Failed to load journal data');
      } finally {
        setLoadingData(false);
      }
    }

    checkExistingJournal();
  }, [user]);

  const formatDateRange = (start, end) => {
    if (!start || !end) return '';
    
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!journalText.trim()) {
      setError('Please enter your journal reflection');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      if (existingJournal) {
        // Update existing journal
        const { error } = await supabase
          .from('weekly_journals')
          .update({
            journal_text: journalText,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingJournal.id);
        
        if (error) throw error;
      } else {
        // Create new journal
        const { error } = await supabase
          .from('weekly_journals')
          .insert([
            {
              user_id: user.id,
              week_start_date: weekDates.start.toISOString().split('T')[0],
              journal_text: journalText
            }
          ]);
        
        if (error) throw error;
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/journals');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving journal:', error);
      setError(error.message || 'Failed to save journal');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Weekly Reflection Journal</h1>
      <p className="text-gray-600 mb-6">
        Week of {formatDateRange(weekDates.start, weekDates.end)}
      </p>
      
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
              <p className="text-sm text-green-700">Journal saved successfully!</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="card">
        <div className="space-y-6">
          <div>
            <label className="label">
              Reflection Prompt
            </label>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="text-gray-700">
                Reflect on your experiences this week. What tasks did you accomplish? 
                What challenges did you face and how did you overcome them? 
                What skills did you develop or improve? 
                How does this experience connect to your career goals?
              </p>
            </div>
          </div>
          
          <div>
            <label htmlFor="journalText" className="label">
              Your Reflection
            </label>
            <textarea
              id="journalText"
              className="input h-64"
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="Write your weekly reflection here..."
              required
            />
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/journals')}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : existingJournal ? 'Update Journal' : 'Save Journal'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default WeeklyJournalForm; 