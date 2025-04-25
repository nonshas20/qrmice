import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import VoiceRecorder from '../components/VoiceRecorder';
import AudioRecorder from '../components/AudioRecorder';

function DailyLogForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const [useAudioRecording, setUseAudioRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasAudioColumn, setHasAudioColumn] = useState(false);
  
  // Ref to store the created log ID if we need to attach audio
  const createdLogIdRef = useRef(null);

  // Check if audio_url column exists in daily_logs table
  useEffect(() => {
    async function checkTableColumns() {
      try {
        // This is a simple check - fetch a single row and see what columns come back
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .limit(1);
        
        if (!error && data) {
          // Check if data has any rows, and if so, check if audio_url exists
          const hasColumn = data.length > 0 
            ? 'audio_url' in data[0] 
            : false;
          
          setHasAudioColumn(hasColumn);
          console.log('Daily logs table has audio_url column:', hasColumn);
        }
      } catch (error) {
        console.warn('Could not check for audio_url column:', error);
        // Assume column doesn't exist if we can't check
        setHasAudioColumn(false);
      }
    }
    
    checkTableColumns();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!date || !hours) {
      setError('Please enter both date and hours');
      return;
    }
    
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      setError('Hours must be a positive number between 0 and 24');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Check if this would exceed the 500 hour limit
      const { data: totalData, error: totalError } = await supabase
        .from('daily_logs')
        .select('hours_worked')
        .eq('user_id', user.id);
      
      if (totalError) throw totalError;
      
      const currentTotal = totalData.reduce((sum, log) => sum + parseFloat(log.hours_worked), 0);
      if (currentTotal + hoursNum > 500) {
        throw new Error(`This entry would exceed the 500 hour limit. You have ${500 - currentTotal} hours remaining.`);
      }
      
      // Check if there's already an entry for this date
      const { data: existingData, error: existingError } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .limit(1);
      
      if (existingError) throw existingError;
      
      if (existingData && existingData.length > 0) {
        throw new Error('You already have an entry for this date. Please edit the existing entry instead.');
      }
      
      // Create the log object based on whether audio_url column exists
      const logData = {
        user_id: user.id,
        date,
        hours_worked: hoursNum,
        notes
      };
      
      // Only add audio_url if the column exists and we have a URL
      if (hasAudioColumn && audioUrl) {
        logData.audio_url = audioUrl;
      }
      
      // Insert the new log
      const { data, error: insertError } = await supabase
        .from('daily_logs')
        .insert([logData])
        .select();
      
      if (insertError) throw insertError;
      
      // If we have a created log and an audio blob to save
      if (data && data.length > 0) {
        createdLogIdRef.current = data[0].id;
        
        // If there's an audio recording that hasn't been saved yet, we'll need to save it
        if (hasAudioColumn && audioBlob && !audioUrl) {
          // We would call a function to upload the audio here
          // This would typically be handled by AudioService.uploadAudio
        }
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/logs');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding daily log:', error);
      setError(error.message || 'Failed to add daily log');
    } finally {
      setLoading(false);
    }
  };

  const toggleInputMethod = () => {
    setUseVoice(!useVoice);
    if (useAudioRecording) {
      setUseAudioRecording(false);
    }
  };

  const toggleAudioRecording = () => {
    // Only toggle if the column exists
    if (!hasAudioColumn) {
      setError('Audio recording is not supported in the current database schema.');
      return;
    }
    
    setUseAudioRecording(!useAudioRecording);
    if (useVoice) {
      setUseVoice(false);
    }
  };

  const handleAudioSaved = (url, blob, duration) => {
    setAudioUrl(url);
    setAudioBlob(blob);
    setAudioDuration(duration);
    setError('');
  };

  const handleAudioError = (error) => {
    console.error('Audio recording error:', error);
    setError(typeof error === 'string' ? error : 'An error occurred with the audio recording. Please try again later or use text input instead.');
    
    // If using voice recording and it fails, switch to text input
    if (useVoice) {
      setUseVoice(false);
    }
    
    // If using audio recording and it fails, hide the recorder
    if (useAudioRecording) {
      setUseAudioRecording(false);
    }
  };

  const clearAudioRecording = () => {
    setAudioUrl('');
    setAudioBlob(null);
    setAudioDuration(0);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold gradient-text mb-2">Daily Activity Log</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Record your OJT hours and activities</p>
        </div>
        <button
          onClick={() => navigate('/logs')}
          className="mt-4 md:mt-0 btn btn-outline group flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          View Log History
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-8 rounded-lg shadow-md animate-slide-up">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-5 mb-8 rounded-lg shadow-md animate-slide-up">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-700 font-medium">Daily log added successfully! Redirecting to log history...</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="glassmorphism p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="relative">
              <label htmlFor="date" className="label text-base font-bold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Select Date
              </label>
              <input
                id="date"
                type="date"
                className="input text-lg py-3 focus:ring-4 focus:ring-primary-300 hover:border-primary-300 transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="relative">
              <label htmlFor="hours" className="label text-base font-bold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Hours Worked
              </label>
              <div className="relative">
                <input
                  id="hours"
                  type="number"
                  className="input text-lg py-3 focus:ring-4 focus:ring-primary-300 hover:border-primary-300 transition-all"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  min="0.5"
                  max="24"
                  step="0.5"
                  required
                  disabled={loading}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">hrs</span>
              </div>
              <p className="text-sm text-gray-500 mt-2 ml-1 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Enter hours from 0.5 to 24, in half-hour increments
              </p>
            </div>

            {/* Input method toggles */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose Input Method</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUseVoice(false);
                    setUseAudioRecording(false);
                  }}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition-all ${
                    !useVoice && !useAudioRecording
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Text Input
                  </span>
                </button>
                <button
                  type="button"
                  onClick={toggleInputMethod}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition-all ${
                    useVoice
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    Voice to Text
                  </span>
                </button>
                {hasAudioColumn && (
                  <button
                    type="button"
                    onClick={toggleAudioRecording}
                    className={`py-2 px-4 rounded-full text-sm font-medium transition-all ${
                      useAudioRecording
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                      </svg>
                      Audio Recording
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative h-full">
              <label className="label text-base font-bold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Activity Details
              </label>
              
              {useVoice && (
                <div className="mt-3 bg-white p-4 rounded-lg border border-primary-100 shadow-sm">
                  <VoiceRecorder
                    value={notes}
                    onChange={setNotes}
                    disabled={loading}
                    placeholder="Click the microphone icon and speak to record your activities..."
                  />
                  <p className="text-xs text-gray-500 mt-3 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Voice recording requires microphone permissions. Speak clearly for best results.
                  </p>
                </div>
              )}
              
              {hasAudioColumn && useAudioRecording && (
                <div className="mt-3 bg-white p-4 rounded-lg border border-primary-100 shadow-sm">
                  <AudioRecorder
                    userId={user?.id}
                    onAudioSaved={handleAudioSaved}
                    onError={handleAudioError}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-3 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Audio recordings will be saved with your daily log.
                  </p>
                </div>
              )}
              
              {!useVoice && !useAudioRecording && (
                <div>
                  <textarea
                    id="notes"
                    className="input h-40 text-base focus:ring-4 focus:ring-primary-300 hover:border-primary-300 transition-all"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe your activities today in detail..."
                    disabled={loading}
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-2 ml-1 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Be specific about tasks, skills practiced, and what you learned.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-12 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/logs')}
            className="btn btn-outline px-6"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white px-8 py-3 text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Log...
              </div>
            ) : 'Save Daily Log'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DailyLogForm; 