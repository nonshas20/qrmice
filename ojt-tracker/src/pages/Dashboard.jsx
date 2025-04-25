import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [hasWeeklyJournal, setHasWeeklyJournal] = useState(false);
  const [todaysLogExists, setTodaysLogExists] = useState(false);

  // Get the current ISO week's Monday
  const getCurrentWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return formatDate(new Date());
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (!user) return;

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Calculate total hours
        const { data: sumData, error: sumError } = await supabase
          .from('daily_logs')
          .select('hours_worked')
          .eq('user_id', user.id);

        if (sumError) throw sumError;
        
        const sum = sumData.reduce((acc, log) => acc + (parseFloat(log.hours_worked) || 0), 0);
        setTotalHours(sum);

        // Fetch recent logs
        const { data: recentLogsData, error: recentLogsError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(5);

        if (recentLogsError) throw recentLogsError;
        setRecentLogs(recentLogsData);

        // Check for current weekly journal
        const weekStart = getCurrentWeekStart();
        const { data: journalData, error: journalError } = await supabase
          .from('weekly_journals')
          .select('id')
          .eq('user_id', user.id)
          .eq('week_start_date', formatDate(weekStart))
          .limit(1);

        if (journalError) throw journalError;
        setHasWeeklyJournal(journalData && journalData.length > 0);

        // Check if today's log exists
        const todayDate = getTodayDate();
        const { data: todayLog, error: todayLogError } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', todayDate)
          .limit(1);

        if (todayLogError) throw todayLogError;
        setTodaysLogExists(todayLog && todayLog.length > 0);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 animate-pulse">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-primary-600 animate-spin"></div>
      </div>
    );
  }

  const targetHours = profile?.target_hours || 500;
  const progressPercentage = Math.min(Math.round((totalHours / targetHours) * 100), 100);
  const hoursRemaining = targetHours - totalHours;

  // Determine progress color
  const getProgressColor = () => {
    if (progressPercentage < 30) return 'from-blue-500 to-blue-600';
    if (progressPercentage < 70) return 'from-green-500 to-green-600';
    return 'from-purple-500 to-purple-600';
  };

  return (
    <div className="space-y-10 py-8 animate-fade-in">
      {/* Hero Section */}
      <div className="glassmorphism p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-primary-300 to-purple-300 rounded-full filter blur-3xl opacity-20 -mr-20 -mt-20 animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-t from-blue-300 to-primary-300 rounded-full filter blur-3xl opacity-20 -ml-20 -mb-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-8 md:mb-0">
              <h1 className="text-4xl font-extrabold gradient-text mb-3">
                Welcome back, {profile?.full_name || 'Student'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-xl">
                Track your OJT progress, log your daily hours, and reflect on your weekly journey.
              </p>
            </div>
            <div className="bg-white/90 dark:bg-dark-surface/90 p-6 rounded-2xl shadow-lg w-full md:w-auto backdrop-blur-sm hover-lift transform-gpu">
              <div className="text-center md:text-right">
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">OJT Progress</p>
                <p className="text-4xl font-extrabold text-primary-600 dark:text-primary-400">{progressPercentage}%</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">{hoursRemaining} hours remaining</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-10">
            <div className="w-full bg-gray-100 dark:bg-dark-surface/50 rounded-full h-8 backdrop-blur-sm shadow-inner">
              <div 
                className={`bg-gradient-to-r ${getProgressColor()} rounded-full h-8 relative transition-all duration-1000 ease-out flex items-center justify-end`}
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse" style={{ animationDuration: '3s' }}></div>
                <span className="text-sm font-bold text-white px-4">{totalHours} / {targetHours} hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Section */}
        <div className="lg:col-span-1">
          <div className="glassmorphism p-6 hover-lift transition-all duration-300">
            <h2 className="text-2xl font-bold gradient-text flex items-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              Quick Actions
            </h2>
            <div className="space-y-4">
              <Link 
                to="/daily-log" 
                className={`block text-center py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-102 hover:shadow-lg ${
                  todaysLogExists 
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' 
                    : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  {todaysLogExists ? 'Update Today\'s Log' : 'Add Today\'s Log'}
                </div>
              </Link>
              
              <Link 
                to="/weekly-journal" 
                className={`block text-center py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-102 hover:shadow-lg ${
                  hasWeeklyJournal 
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100' 
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  {hasWeeklyJournal ? 'Update Weekly Journal' : 'Write Weekly Journal'}
                </div>
              </Link>
              
              <Link 
                to="/logs" 
                className="block text-center py-4 px-4 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-xl shadow-md border border-gray-200 hover:from-white hover:to-gray-50 transition-all transform hover:scale-102 hover:shadow-lg"
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                  </svg>
                  View Log History
                </div>
              </Link>
              
              <Link 
                to="/journals" 
                className="block text-center py-4 px-4 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-xl shadow-md border border-gray-200 hover:from-white hover:to-gray-50 transition-all transform hover:scale-102 hover:shadow-lg"
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  View Journal History
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats & Recent Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glassmorphism p-6 hover-lift transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Hours</p>
                  <p className="text-3xl font-extrabold text-gray-800 dark:text-white">{totalHours}</p>
                </div>
              </div>
            </div>
            
            <div className="glassmorphism p-6 hover-lift transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Target</p>
                  <p className="text-3xl font-extrabold text-gray-800 dark:text-white">{targetHours}</p>
                </div>
              </div>
            </div>
            
            <div className="glassmorphism p-6 hover-lift transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completion</p>
                  <p className="text-3xl font-extrabold text-gray-800 dark:text-white">{progressPercentage}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glassmorphism p-6 hover-lift transition-all duration-300">
            <h2 className="text-2xl font-bold gradient-text flex items-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Recent Activity
            </h2>
            
            {recentLogs.length > 0 ? (
              <div className="mt-4 overflow-hidden">
                <div className="flow-root">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentLogs.map((log, index) => (
                      <li key={log.id} className="py-4 animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-600 shadow-md">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-gray-900 dark:text-white">
                              {new Date(log.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{log.notes || 'No notes added'}</p>
                          </div>
                          <div className="inline-flex items-center text-lg font-semibold text-white px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 shadow-md">
                            {log.hours_worked} hrs
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  <Link 
                    to="/logs" 
                    className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all hover:shadow-md"
                  >
                    View all logs
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-full inline-block mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">No logs yet</h3>
                <p className="mt-1 text-base text-gray-500 dark:text-gray-400">Start by adding your daily logs to track your progress.</p>
                <div className="mt-6">
                  <Link
                    to="/daily-log"
                    className="inline-flex items-center px-5 py-3 border border-transparent shadow-md text-base font-medium rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all transform hover:scale-105"
                  >
                    Add your first log
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Alert */}
      {!hasWeeklyJournal && (
        <div className="glassmorphism p-6 border-l-4 border-amber-400 animate-slide-up">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="h-7 w-7 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-amber-800">Weekly Reflection Needed</h3>
              <div className="mt-2 text-base text-amber-700">
                <p>
                  Don't forget to write your weekly journal for this week. Reflection is an important part of your OJT experience.
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link
                    to="/weekly-journal"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 rounded-lg text-white shadow-md hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all transform hover:scale-105"
                  >
                    Write Journal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard; 