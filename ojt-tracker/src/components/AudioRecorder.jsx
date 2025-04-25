import { useState, useEffect, useRef } from 'react';
import AudioService from '../services/AudioService';

/**
 * AudioRecorder component for recording and storing audio files
 * 
 * @param {Object} props Component props
 * @param {string} props.userId User ID for file ownership
 * @param {string} props.dailyLogId Daily log ID this recording belongs to (optional)
 * @param {Function} props.onAudioSaved Callback when audio is saved, receives URL
 * @param {Function} props.onError Callback for error handling
 * @param {boolean} props.disabled Whether the recorder is disabled
 */
function AudioRecorder({ userId, dailyLogId, onAudioSaved, onError, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  
  // Check if MediaRecorder is supported
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setIsSupported(false);
      const errorMessage = 'Audio recording is not supported in this browser. Please try Chrome, Edge, or Safari.';
      setErrorMsg(errorMessage);
      if (onError) onError(errorMessage);
      return;
    }

    // Test for permissions
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Clean up stream immediately after test
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(error => {
        console.error("Permission test failed:", error);
        // Don't mark as unsupported, just show an error - the user can grant permission later
        setErrorMsg('Microphone access is required for audio recording. Please allow microphone access when prompted.');
      });
  }, [onError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks();
      clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    if (disabled) return;
    
    try {
      clearAudioData();
      setErrorMsg('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const options = { mimeType: 'audio/webm' };
      let mediaRecorder;
      
      // Try different mime types if the default isn't supported
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('audio/webm is not supported, trying audio/ogg', e);
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/ogg' });
        } catch (e2) {
          console.warn('audio/ogg is not supported, trying without mimeType', e2);
          mediaRecorder = new MediaRecorder(stream);
        }
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleRecordingStop;
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setErrorMsg(`Recording error: ${event.error?.message || 'Unknown error'}`);
        if (onError) onError(event.error || new Error('Recording error'));
        setIsRecording(false);
        stopMediaTracks();
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = `Could not start recording: ${error.message || 'Access denied or device unavailable'}`;
      setErrorMsg(errorMessage);
      if (onError) onError(errorMessage);
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    
    try {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    } catch (error) {
      console.error('Error pausing recording:', error);
      // If pause fails, try to stop the recording entirely
      stopRecording();
    }
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'paused') return;
    
    try {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error resuming recording:', error);
      // If resume fails, try to stop the recording entirely
      stopRecording();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    
    try {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      
      // Stop all media tracks
      stopMediaTracks();
    } catch (error) {
      console.error('Error stopping recording:', error);
      // Clean up anyway
      clearInterval(timerRef.current);
      stopMediaTracks();
      setIsRecording(false);
      setIsPaused(false);
      
      // If we have some audio chunks, we can still try to create a recording
      if (audioChunksRef.current.length > 0) {
        handleRecordingStop();
      }
    }
  };

  const handleRecordingStop = () => {
    try {
      if (audioChunksRef.current.length === 0) {
        setErrorMsg('No audio data was captured. Please try again.');
        setIsRecording(false);
        setIsPaused(false);
        return;
      }
      
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      if (audioBlob.size === 0) {
        setErrorMsg('Recorded audio has no data. Please try again.');
        setIsRecording(false);
        setIsPaused(false);
        return;
      }
      
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setIsRecording(false);
      setIsPaused(false);
    } catch (error) {
      console.error('Error handling recording stop:', error);
      setErrorMsg('An error occurred while finalizing the recording. Please try again.');
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const stopMediaTracks = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error stopping media tracks:', error);
      } finally {
        streamRef.current = null;
      }
    }
  };

  const clearAudioData = () => {
    audioChunksRef.current = [];
    
    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (error) {
        console.error('Error revoking object URL:', error);
      }
    }
    
    setAudioUrl('');
    setDuration(0);
  };

  const saveRecording = async () => {
    if (!audioUrl || !audioChunksRef.current.length) {
      setErrorMsg('No recording available to save');
      return;
    }
    
    if (!userId) {
      setErrorMsg('User ID is required to save the recording');
      if (onError) onError('User ID is required');
      return;
    }
    
    try {
      setIsSaving(true);
      setErrorMsg('');
      
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      // Use a mock ID for development if dailyLogId is not provided
      const logId = dailyLogId || `temp-${Date.now()}`;
      
      const result = await AudioService.uploadAudio(audioBlob, userId, logId);
      
      if (onAudioSaved) {
        onAudioSaved(result.filePath, audioBlob, result.duration);
      }
      
      setIsSaving(false);
      clearAudioData();
      
    } catch (error) {
      console.error('Error saving recording:', error);
      const errorMessage = `Failed to save recording: ${error.message || 'Unknown error'}`;
      setErrorMsg(errorMessage);
      setIsSaving(false);
      if (onError) onError(errorMessage);
    }
  };

  const cancelRecording = () => {
    stopMediaTracks();
    clearAudioData();
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
    setErrorMsg('');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="mt-2 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">{errorMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-recorder mt-4 p-4 border border-gray-300 rounded-md bg-white">
      {/* Recording Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {isRecording && (
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="ml-2 text-sm font-medium">
                {isPaused ? 'Paused' : 'Recording'} - {formatTime(duration)}
              </span>
            </div>
          )}
          {!isRecording && !audioUrl && (
            <span className="text-sm text-gray-500">Click record to start</span>
          )}
          {!isRecording && audioUrl && (
            <span className="text-sm text-gray-700">Recording available - {formatTime(duration)}</span>
          )}
        </div>
        
        {/* Timer */}
        {isRecording && (
          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
            {formatTime(duration)}
          </span>
        )}
      </div>
      
      {/* Audio Player */}
      {audioUrl && !isRecording && (
        <div className="mb-4">
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!isRecording && !audioUrl && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled || isSaving}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            title="Start recording"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}
        
        {isRecording && !isPaused && (
          <>
            <button
              type="button"
              onClick={pauseRecording}
              disabled={disabled}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              title="Pause recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={stopRecording}
              disabled={disabled}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              title="Stop recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </>
        )}
        
        {isRecording && isPaused && (
          <>
            <button
              type="button"
              onClick={resumeRecording}
              disabled={disabled}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              title="Resume recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={stopRecording}
              disabled={disabled}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              title="Stop recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </>
        )}
        
        {!isRecording && audioUrl && (
          <>
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || isSaving}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              title="Record new"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={saveRecording}
              disabled={disabled || isSaving}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : 'Save Recording'}
            </button>
            
            <button
              type="button"
              onClick={cancelRecording}
              disabled={disabled || isSaving}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
      
      {/* Error Message */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioRecorder; 