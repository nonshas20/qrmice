import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function JournalHistory() {
  const { user } = useAuth();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const journalsPerPage = 5;

  useEffect(() => {
    fetchJournals();
  }, [user, currentPage, searchTerm]);

  async function fetchJournals() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('weekly_journals')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false });
      
      // Apply search filter if present
      if (searchTerm) {
        query = query.ilike('journal_text', `%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * journalsPerPage;
      const to = from + journalsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setJournals(data || []);
      setTotalPages(Math.ceil((count || 0) / journalsPerPage));
    } catch (error) {
      console.error('Error fetching journals:', error);
      setError('Failed to fetch journals');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this journal entry?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('weekly_journals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh journals
      fetchJournals();
    } catch (error) {
      console.error('Error deleting journal:', error);
      setError('Failed to delete journal');
    }
  };

  const formatDateRange = (weekStartDate) => {
    try {
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const options = { month: 'long', day: 'numeric', year: 'numeric' };
      return `${weekStart.toLocaleDateString(undefined, options)} - ${weekEnd.toLocaleDateString(undefined, options)}`;
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Weekly Journal History</h1>
        <Link to="/weekly-journal" className="btn btn-primary">
          Write New Journal
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search journals..."
            className="input flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : journals.length > 0 ? (
        <div className="space-y-6">
          {journals.map((journal) => (
            <div key={journal.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-primary-600">
                  Week of {formatDateRange(journal.week_start_date)}
                </h2>
                <button
                  onClick={() => handleDelete(journal.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </div>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{journal.journal_text}</p>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {journal.updated_at !== journal.created_at 
                  ? `Updated on ${new Date(journal.updated_at).toLocaleString()}`
                  : `Created on ${new Date(journal.created_at).toLocaleString()}`
                }
              </div>
              <div className="mt-4">
                <Link to={`/weekly-journal`} className="text-primary-600 hover:text-primary-800">
                  Edit this journal
                </Link>
              </div>
            </div>
          ))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline py-2 px-4"
              >
                Previous
              </button>
              <span className="text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline py-2 px-4"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No journal entries found.</p>
          <Link to="/weekly-journal" className="btn btn-primary mt-4 inline-block">
            Write Your First Journal
          </Link>
        </div>
      )}
    </div>
  );
}

export default JournalHistory; 