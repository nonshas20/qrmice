import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import AIService from '../services/AIService';
import DarkModeToggle from '../components/DarkModeToggle';

function WeeklySummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasJournal, setHasJournal] = useState(false);
  const [journalId, setJournalId] = useState(null);
  const [useAI, setUseAI] = useState(true); // Default to using AI
  const [aiProvider, setAiProvider] = useState('gemini'); // Default to Gemini
  
  // Use a single state object for week-related data
  const [weekData, setWeekData] = useState({
    weekStart: getCurrentWeekStart(),
    weekEnd: getWeekEnd(getCurrentWeekStart()),
    weeklyHours: 0,
    dailyBreakdown: [],
  });

  // Get the Monday of the current ISO week (week starts on Monday)
  function getCurrentWeekStart() {
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 });
  }

  // Get the end date of the week (Sunday)
  function getWeekEnd(weekStart) {
    return endOfWeek(new Date(weekStart), { weekStartsOn: 1 });
  }

  // Format date to YYYY-MM-DD for database queries
  function formatDate(date) {
    return format(date, 'yyyy-MM-dd');
  }

  // Format date range for display
  function formatDateRange(start, end) {
    if (!start || !end) return '';
    
    return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`;
  }

  // Navigate to previous or next week
  function navigateWeek(direction) {
    const { weekStart } = weekData;
    const newWeekStart = direction === 'prev' 
      ? subWeeks(weekStart, 1) 
      : addWeeks(weekStart, 1);
    
    const newWeekEnd = getWeekEnd(newWeekStart);
    
    setWeekData({
      ...weekData,
      weekStart: newWeekStart,
      weekEnd: newWeekEnd
    });
  }

  // Fetch weekly summary data whenever user or selected week changes
  useEffect(() => {
    if (user) {
      fetchWeeklySummary();
    }
  }, [user, weekData.weekStart]);

  // Fetch all data for the selected week
  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      setError('');

      const { weekStart, weekEnd } = weekData;
      const formattedWeekStart = formatDate(weekStart);
      const formattedWeekEnd = formatDate(weekEnd);

      // Fetch daily logs for the selected week
      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', formattedWeekStart)
        .lte('date', formattedWeekEnd)
        .order('date', { ascending: true });

      if (logsError) throw logsError;

      // Process the data to get daily breakdown and total hours
      const dailyBreakdown = [];
      let weeklyHours = 0;

      // Create an array of all days in the week
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + i);
        const formattedDate = formatDate(currentDate);
        
        // Find the log for this date if it exists
        const log = logsData.find(log => log.date === formattedDate);
        
        dailyBreakdown.push({
          date: currentDate,
          formattedDate: format(currentDate, 'EEE, MMM d'),
          hours: log ? parseFloat(log.hours_worked) : 0,
          notes: log ? log.notes : '',
          hasLog: !!log
        });
        
        if (log) {
          weeklyHours += parseFloat(log.hours_worked);
        }
      }

      // Check if there's an existing journal for this week
      const { data: journalData, error: journalError } = await supabase
        .from('weekly_journals')
        .select('id, journal_text')
        .eq('user_id', user.id)
        .eq('week_start_date', formattedWeekStart)
        .single();
      
      if (journalError && journalError.code !== 'PGRST116') { // PGRST116 = not found
        throw journalError;
      }
      
      if (journalData) {
        setHasJournal(true);
        setJournalId(journalData.id);
        setSummary(journalData.journal_text);
      } else {
        setHasJournal(false);
        setJournalId(null);
        setSummary('');
      }

      setWeekData({
        ...weekData,
        weeklyHours,
        dailyBreakdown
      });
      
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
      setError('Failed to load weekly summary. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Generate a summary of the weekly activities
  async function generateSummary() {
    if (weekData.dailyBreakdown.length === 0 || weekData.weeklyHours === 0) {
      setError('No daily logs found for this week');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      if (useAI) {
        // Use AI to generate summary
        const aiSummary = await AIService.generateSummary(weekData, aiProvider);
        setSummary(aiSummary);
      } else {
        // Create a manual structured summary based on daily logs
        let summaryText = `Weekly Summary: ${format(weekData.weekStart, 'MMMM d')} - ${format(weekData.weekEnd, 'MMMM d, yyyy')}\n\n`;
        summaryText += `Total Hours: ${weekData.weeklyHours.toFixed(2)}\n\n`;
        summaryText += `Daily Activities:\n\n`;
        
        weekData.dailyBreakdown.forEach(day => {
          if (day.hasLog) {
            summaryText += `${day.formattedDate} - ${day.hours} hours\n`;
            if (day.notes && day.notes.trim()) {
              summaryText += `Activities: ${day.notes}\n`;
            }
            summaryText += '\n';
          }
        });
        
        setSummary(summaryText);
      }
      setSuccess(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      setError(`Failed to generate summary: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  // Save the generated summary to a weekly journal
  async function saveToJournal() {
    if (!summary) {
      setError('Please generate a summary first');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const formattedWeekStart = formatDate(weekData.weekStart);
      
      if (hasJournal) {
        // Update existing journal
        const { error } = await supabase
          .from('weekly_journals')
          .update({
            journal_text: summary,
            updated_at: new Date().toISOString()
          })
          .eq('id', journalId);
        
        if (error) throw error;
      } else {
        // Create new journal
        const { error } = await supabase
          .from('weekly_journals')
          .insert([
            {
              user_id: user.id,
              week_start_date: formattedWeekStart,
              journal_text: summary
            }
          ]);
        
        if (error) throw error;
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/journals');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving to journal:', error);
      setError(error.message || 'Failed to save journal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-text-primary">Weekly Summary</h1>
          <DarkModeToggle />
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-600 dark:text-gray-300"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <h2 className="text-lg font-medium text-gray-700 dark:text-dark-text-primary">
            {formatDateRange(weekData.weekStart, weekData.weekEnd)}
          </h2>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-600 dark:text-gray-300"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-6">
            {error}
          </div>
        ) : (
          <>
            {/* Weekly Total */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300">Weekly Total</h3>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-2">{weekData.weeklyHours.toFixed(2)} hours</p>
            </div>

            {/* Daily Breakdown */}
            <div className="overflow-hidden border border-gray-200 dark:border-dark-border rounded-lg mb-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-divider">
                <thead className="bg-gray-50 dark:bg-dark-surface/60">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                      Day
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                      Hours
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-divider">
                  {weekData.dailyBreakdown.map((day, index) => (
                    <tr key={index} className={!day.hasLog ? "bg-gray-50 dark:bg-dark-surface/80" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                        {day.formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-text-secondary">
                        {day.hours > 0 ? `${day.hours.toFixed(2)} hours` : "No log"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-dark-text-secondary">
                        {day.notes ? (
                          <div className="max-h-20 overflow-y-auto">
                            {day.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-dark-text-disabled italic">No notes</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Generation and Journal Actions */}
            <div className="mt-8 space-y-4">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 justify-between">
                <div className="flex flex-col w-full md:w-auto space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useAI"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useAI" className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                      Use AI to enhance summary
                    </label>
                  </div>
                  
                  {useAI && (
                    <div className="flex items-center ml-6 space-x-4">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="providerGemini"
                          name="aiProvider"
                          value="gemini"
                          checked={aiProvider === 'gemini'}
                          onChange={() => setAiProvider('gemini')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <label htmlFor="providerGemini" className="ml-2 text-sm text-gray-700 dark:text-dark-text-primary">
                          Gemini
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="providerOpenAI"
                          name="aiProvider"
                          value="openai"
                          checked={aiProvider === 'openai'}
                          onChange={() => setAiProvider('openai')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <label htmlFor="providerOpenAI" className="ml-2 text-sm text-gray-700 dark:text-dark-text-primary">
                          OpenAI
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={generateSummary}
                    disabled={isGenerating || weekData.weeklyHours === 0}
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating with {aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'}...
                      </span>
                    ) : (
                      `Generate Summary${useAI ? ' with ' + (aiProvider === 'gemini' ? 'Gemini' : 'OpenAI') : ''}`
                    )}
                  </button>
                </div>
                
                <button
                  onClick={saveToJournal}
                  disabled={loading || !summary}
                  className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {hasJournal ? 'Update Journal' : 'Save to Journal'}
                </button>
              </div>

              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-md">
                  {hasJournal ? 'Journal updated successfully!' : 'Journal created successfully!'}
                </div>
              )}

              {summary && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text-primary mb-2">Summary Preview</h3>
                  <div className="bg-gray-50 dark:bg-dark-surface/70 p-4 rounded-lg border border-gray-200 dark:border-dark-border whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-dark-text-primary">
                    {summary}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklySummary; 