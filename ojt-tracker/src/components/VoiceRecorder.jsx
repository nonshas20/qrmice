import { useState, useEffect, useRef } from 'react';

/**
 * VoiceRecorder component that uses the Web Speech API for speech-to-text conversion
 * 
 * @param {Object} props Component props
 * @param {string} props.value Current text value
 * @param {Function} props.onChange Callback function when text changes
 * @param {string} props.placeholder Placeholder text for the display area
 * @param {boolean} props.disabled Whether the recorder is disabled
 */
function VoiceRecorder({ value, onChange, placeholder = "Speak to record your activities...", disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [networkRetryCount, setNetworkRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [persistentNetworkIssue, setPersistentNetworkIssue] = useState(false);
  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const networkRetryTimeoutRef = useRef(null);

  // Check if speech recognition is supported
  useEffect(() => {
    // Different browsers have different implementations
    const SpeechRecognition = 
      window.SpeechRecognition || 
      window.webkitSpeechRecognition || 
      window.mozSpeechRecognition || 
      window.msSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMsg('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    // Test if we can create an instance (some browsers claim support but don't fully implement)
    try {
      const testRecognition = new SpeechRecognition();
      if (!testRecognition) throw new Error('Failed to create recognition instance');
    } catch (error) {
      console.error('Speech recognition instantiation error:', error);
      setIsSupported(false);
      setErrorMsg('Your browser appears to support speech recognition but there was an error initializing it. Please try a different browser.');
    }

    // Check for online status
    const handleOnlineStatus = () => {
      console.log("Online status changed:", navigator.onLine);
      if (navigator.onLine) {
        if (isRetrying || persistentNetworkIssue) {
          // If we're back online and were retrying, restart recognition
          setIsRetrying(false);
          setPersistentNetworkIssue(false);
          setErrorMsg('');
          if (isRecording) {
            setTimeout(() => {
              startRecording();
            }, 1000);
          }
        }
      } else {
        // We're offline
        if (isRecording) {
          setErrorMsg('Internet connection lost. Voice recognition requires an active connection.');
          stopRecording();
        }
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [isRecording, isRetrying, persistentNetworkIssue]);

  // Reset persistent network issue flag on component re-mount
  useEffect(() => {
    setPersistentNetworkIssue(false);
    
    // Initial check of online status
    if (!navigator.onLine) {
      setErrorMsg('You appear to be offline. Voice recognition requires an internet connection.');
    }
    
    return () => {
      // Clean up on unmount
    };
  }, []);

  const createRecognitionInstance = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping existing recognition instance:', e);
      }
      recognitionRef.current = null;
    }

    const SpeechRecognition = 
      window.SpeechRecognition || 
      window.webkitSpeechRecognition || 
      window.mozSpeechRecognition || 
      window.msSpeechRecognition;
    
    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';
      return recognition;
    } catch (error) {
      console.error('Error creating recognition instance:', error);
      return null;
    }
  };

  // Initialize speech recognition
  const initializeRecognition = () => {
    try {
      const recognition = createRecognitionInstance();
      if (!recognition) {
        setIsSupported(false);
        setErrorMsg('Failed to initialize speech recognition. Please try a different browser.');
        return false;
      }

      recognition.onstart = () => {
        setIsRecording(true);
        setErrorMsg('');
        setIsRetrying(false);
        console.log('Speech recognition started');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        let message = 'An error occurred while recording. ';
        let isFatalError = false;
        let shouldRetry = false;
        
        switch (event.error) {
          case 'not-allowed':
            message += 'Microphone access was denied. Please allow microphone access in your browser settings and try again.';
            isFatalError = true;
            break;
          case 'audio-capture':
            message += 'No microphone was found. Please ensure your microphone is connected and functioning properly.';
            isFatalError = true;
            break;
          case 'network':
            if (!navigator.onLine) {
              message += 'You appear to be offline. Voice recognition requires an internet connection. Please check your network connection and try again when online.';
              shouldRetry = false;
              isFatalError = true;
            } else {
              if (networkRetryCount >= 3) {
                message += 'Network connection issues persist. The speech recognition service might be blocked by a firewall, VPN, or proxy. Try:';
                message += '\n1. Disabling any VPN, proxy, or firewall temporarily';
                message += '\n2. Using a different network connection';
                message += '\n3. Trying again later';
                setPersistentNetworkIssue(true);
                isFatalError = true;
              } else {
                message += 'Network connection error. The speech recognition service might be temporarily unavailable.';
                // If we have internet but still getting network errors, retry with backoff
                shouldRetry = true;
                if (shouldRetry) {
                  message += ' Retrying automatically...';
                }
              }
            }
            break;
          case 'aborted':
            message += 'Recording was aborted.';
            break;
          case 'no-speech':
            message += 'No speech was detected. Please try speaking more clearly.';
            // Auto-restart on no-speech error after a short delay
            if (isRecording) {
              restartTimeoutRef.current = setTimeout(() => {
                if (isRecording) {
                  try {
                    console.log('Restarting after no-speech error');
                    recognition.stop();
                    setTimeout(() => {
                      if (isRecording) recognition.start();
                    }, 300);
                  } catch (e) {
                    console.warn('Error during no-speech recovery:', e);
                  }
                }
              }, 500);
            }
            break;
          case 'language-not-supported':
            message += 'The selected language is not supported.';
            isFatalError = true;
            break;
          default:
            message += 'Please try again or use manual text entry instead.';
        }
        
        // Handle network error retries
        if (event.error === 'network' && shouldRetry && !persistentNetworkIssue) {
          setIsRetrying(true);
          setNetworkRetryCount(prev => prev + 1);
          
          // Exponential backoff for retries (1s, 2s, 4s)
          const retryDelay = Math.pow(2, networkRetryCount) * 1000;
          
          networkRetryTimeoutRef.current = setTimeout(() => {
            if (isRecording) {
              console.log(`Retrying after network error (attempt ${networkRetryCount + 1})`);
              try {
                if (recognitionRef.current) {
                  recognitionRef.current.stop();
                  setTimeout(() => {
                    if (isRecording) recognitionRef.current.start();
                  }, 300);
                } else {
                  startRecording();
                }
              } catch (e) {
                console.warn('Error during network error recovery:', e);
              }
            }
          }, retryDelay);
        }
        
        // Don't show error for no-speech because we're auto-restarting
        if (event.error !== 'no-speech') {
          setErrorMsg(message);
        }
        
        // Only set isRecording to false for fatal errors
        if (isFatalError) {
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        
        // Auto-restart if still in recording mode (for recoverable errors)
        if (isRecording && !isRetrying && !persistentNetworkIssue) {
          try {
            console.log('Auto-restarting recognition');
            setTimeout(() => {
              if (isRecording && recognitionRef.current && !isRetrying && !persistentNetworkIssue) {
                recognitionRef.current.start();
              }
            }, 500);
          } catch (error) {
            console.error('Error restarting recognition:', error);
            setIsRecording(false);
            setInterimTranscript('');
            setErrorMsg('Recording stopped due to an error. Please try again.');
          }
        } else if (!isRetrying) {
          setInterimTranscript('');
        }
      };

      recognition.onresult = (event) => {
        // If we get results, reset the network retry count
        if (networkRetryCount > 0) {
          setNetworkRetryCount(0);
          setIsRetrying(false);
          setPersistentNetworkIssue(false);
        }
        
        let interim = '';
        let final = value || '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            // Append to the existing text with a space
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) {
              final += (final ? ' ' : '') + transcript;
            }
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final !== value) {
          onChange(final);
        }
        setInterimTranscript(interim);
      };

      recognitionRef.current = recognition;
      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setIsSupported(false);
      setErrorMsg('There was an error setting up speech recognition. Please try a different browser or use manual text entry.');
      return false;
    }
  };

  const startRecording = () => {
    if (disabled) return;
    
    // Clear any pending timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (networkRetryTimeoutRef.current) {
      clearTimeout(networkRetryTimeoutRef.current);
      networkRetryTimeoutRef.current = null;
    }
    
    // Check if online before attempting to record
    if (!navigator.onLine) {
      setErrorMsg('You appear to be offline. Voice recognition requires an internet connection. Please check your network and try again when online.');
      return;
    }
    
    // Reset retry counters when manually starting a new recording
    setNetworkRetryCount(0);
    setIsRetrying(false);
    setPersistentNetworkIssue(false);
    
    try {
      let success = false;
      if (!recognitionRef.current) {
        success = initializeRecognition();
      } else {
        success = true;
      }
      
      if (!success || !recognitionRef.current) {
        setErrorMsg('Could not initialize speech recognition. Please refresh and try again, or use manual text entry.');
        return;
      }
      
      recognitionRef.current.start();
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recognition:', error);
      
      // Try reinitializing and starting again
      try {
        if (initializeRecognition() && recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          throw new Error('Failed to reinitialize');
        }
      } catch (retryError) {
        console.error('Error on retry:', retryError);
        setErrorMsg('Failed to start recording. This may be due to microphone permissions or browser compatibility issues. Try refreshing the page or using a different browser.');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    // Clear any pending timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (networkRetryTimeoutRef.current) {
      clearTimeout(networkRetryTimeoutRef.current);
      networkRetryTimeoutRef.current = null;
    }
    
    setIsRecording(false);
    setIsRetrying(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
        // Still reset the UI state even if the API call fails
        setInterimTranscript('');
      }
    }
  };

  const resetAndRetry = () => {
    // Reset all error states and try again
    setNetworkRetryCount(0);
    setPersistentNetworkIssue(false);
    setIsRetrying(false);
    setErrorMsg('');
    
    // Small delay before starting new recording
    setTimeout(() => {
      startRecording();
    }, 500);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      
      if (networkRetryTimeoutRef.current) {
        clearTimeout(networkRetryTimeoutRef.current);
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error cleaning up speech recognition:', error);
        }
      }
    };
  }, []);

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
        <div className="mt-3">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Please type your notes here instead..."
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={5}
            disabled={disabled}
          ></textarea>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-recorder mt-2">
      <div className="relative">
        <div 
          className={`p-4 rounded-md border min-h-[120px] transition-all ${
            isRecording 
              ? isRetrying 
                ? 'border-yellow-400 shadow-md bg-yellow-50' 
                : 'border-primary-400 shadow-md bg-primary-50 animate-pulse-slow'
              : persistentNetworkIssue
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 bg-white'
          }`}
        >
          <div className="text-gray-800 whitespace-pre-wrap break-words mb-2">
            {value ? (
              <span>{value}</span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
            {isRecording && interimTranscript && (
              <span className="text-primary-500">{value ? ' ' : ''}{interimTranscript}</span>
            )}
          </div>
          {isRecording && (
            <div className="flex items-center justify-center mt-1">
              <div className="flex space-x-1">
                <div className={`h-2 w-2 ${isRetrying ? 'bg-yellow-500' : 'bg-primary-600'} rounded-full animate-bounce`}></div>
                <div className={`h-2 w-2 ${isRetrying ? 'bg-yellow-500' : 'bg-primary-600'} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                <div className={`h-2 w-2 ${isRetrying ? 'bg-yellow-500' : 'bg-primary-600'} rounded-full animate-bounce`} style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="ml-2 text-xs text-gray-500">
                {isRetrying ? 'Reconnecting...' : 'Recording...'}
              </span>
            </div>
          )}
        </div>

        <div className="absolute top-2 right-2">
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              disabled={disabled}
              className="p-2 rounded-full text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Stop recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || !navigator.onLine}
              className={`p-2 rounded-full ${!navigator.onLine || persistentNetworkIssue ? 'text-gray-400 cursor-not-allowed' : 'text-primary-600 hover:bg-primary-50'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
              title={!navigator.onLine ? "Cannot record while offline" : persistentNetworkIssue ? "Network issues detected" : "Start recording"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 whitespace-pre-line">{errorMsg}</p>
              
              {persistentNetworkIssue && (
                <div className="mt-2">
                  <button
                    onClick={resetAndRetry}
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md"
                  >
                    Reset and try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-gray-500">
          {!isRecording && (
            <span>
              {!navigator.onLine 
                ? "Voice recording is unavailable while offline" 
                : persistentNetworkIssue
                  ? "Network issues detected with speech recognition"
                  : "Click the microphone to start recording"}
            </span>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default VoiceRecorder; 