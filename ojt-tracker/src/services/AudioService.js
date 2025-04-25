import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a random ID to use instead of UUID
 * @returns {string} A random ID
 */
function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

/**
 * Service for handling audio recording functionality 
 */
class AudioService {
  // Cache for table structure info to avoid repeated checks
  static tableInfo = {
    dailyLogsHasAudioUrl: null,
    audioLogsExists: null
  };

  /**
   * Check if the daily_logs table has an audio_url column
   * @returns {Promise<boolean>} Whether the column exists
   */
  static async checkDailyLogsHasAudioUrl() {
    if (this.tableInfo.dailyLogsHasAudioUrl !== null) {
      return this.tableInfo.dailyLogsHasAudioUrl;
    }
    
    try {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      
      // Check if data has any rows, and if so, check if audio_url exists
      const hasColumn = data && data.length > 0 
        ? 'audio_url' in data[0] 
        : false;
      
      this.tableInfo.dailyLogsHasAudioUrl = hasColumn;
      return hasColumn;
    } catch (error) {
      console.warn('Could not check for audio_url column:', error);
      return false;
    }
  }
  
  /**
   * Check if the audio_logs table exists
   * @returns {Promise<boolean>} Whether the table exists
   */
  static async checkAudioLogsExists() {
    if (this.tableInfo.audioLogsExists !== null) {
      return this.tableInfo.audioLogsExists;
    }
    
    try {
      const { error } = await supabase
        .from('audio_logs')
        .select('id')
        .limit(1);
      
      const exists = !error || (error && !error.message.includes('relation "audio_logs" does not exist'));
      this.tableInfo.audioLogsExists = exists;
      return exists;
    } catch (error) {
      console.warn('Error checking audio_logs table:', error);
      return false;
    }
  }

  /**
   * Upload a voice recording to Supabase storage
   * @param {Blob} audioBlob - The audio blob to upload
   * @param {string} userId - The user ID for file ownership
   * @param {string} dailyLogId - ID of the daily log this recording belongs to
   * @returns {Promise<{filePath: string, duration: number}>} The file path and duration
   */
  static async uploadAudio(audioBlob, userId, dailyLogId) {
    try {
      if (!audioBlob || !userId || !dailyLogId) {
        throw new Error('Missing required parameters for audio upload');
      }

      // Check if Supabase is initialized
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // Get audio duration before uploading
      const duration = await this.getAudioDuration(audioBlob);

      // For development/testing only - if Supabase storage is not configured, return a mock URL
      // This prevents errors in development environments without proper Supabase setup
      if (!supabase.storage || process.env.NODE_ENV === 'development') {
        console.warn('Using mock storage for development environment');
        // Return a mock response for development
        return {
          filePath: URL.createObjectURL(audioBlob),
          duration
        };
      }

      // Generate a unique filename
      const fileExtension = this.getFileExtension(audioBlob.type);
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `${userId}/daily-logs/${dailyLogId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-recordings')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          contentType: audioBlob.type
        });

      if (error) {
        // If the bucket doesn't exist, provide a helpful error
        if (error.message && error.message.includes('bucket not found')) {
          throw new Error('Storage bucket "voice-recordings" not found. Please create it in your Supabase project.');
        }
        throw error;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('voice-recordings')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for the uploaded file');
      }

      // Check if the daily_logs table has audio_url column
      const hasAudioUrl = await this.checkDailyLogsHasAudioUrl();
      if (hasAudioUrl) {
        // Update the daily log with the audio URL
        try {
          const { error: updateError } = await supabase
            .from('daily_logs')
            .update({ audio_url: urlData.publicUrl })
            .eq('id', dailyLogId);
          
          if (updateError) {
            console.warn('Could not update daily log with audio URL:', updateError);
          }
        } catch (updateError) {
          console.warn('Error updating daily log:', updateError);
        }
      }

      // Create audio log record if the table exists
      const audioLogsExists = await this.checkAudioLogsExists();
      if (audioLogsExists) {
        try {
          await this.createAudioLogRecord(userId, dailyLogId, filePath, duration);
        } catch (logError) {
          console.warn('Could not create audio log record, but file was uploaded:', logError);
        }
      }

      return {
        filePath: urlData.publicUrl,
        duration
      };
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  }

  /**
   * Create a record in the audio_logs table
   * @param {string} userId - User ID
   * @param {string} dailyLogId - Daily log ID
   * @param {string} filePath - Path to the audio file
   * @param {number} duration - Duration of the audio in seconds
   */
  static async createAudioLogRecord(userId, dailyLogId, filePath, duration) {
    try {
      // Check if the audio_logs table exists first
      const tableExists = await this.checkAudioLogsExists();
      if (!tableExists) {
        console.warn('audio_logs table does not exist, skipping record creation');
        return;
      }

      const { error } = await supabase
        .from('audio_logs')
        .insert([
          {
            user_id: userId,
            daily_log_id: dailyLogId,
            file_path: filePath,
            duration
          }
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating audio log record:', error);
      throw error;
    }
  }

  /**
   * Get audio duration from blob
   * @param {Blob} audioBlob - The audio blob
   * @returns {Promise<number>} Duration in seconds
   */
  static getAudioDuration(audioBlob) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(audio.src);
        resolve(Math.round(audio.duration));
      });
      
      audio.addEventListener('error', (err) => {
        URL.revokeObjectURL(audio.src);
        // Resolve with a default duration rather than rejecting
        console.warn('Error getting audio duration, using default:', err);
        resolve(0);
      });

      // Add a timeout in case the metadata never loads
      setTimeout(() => {
        URL.revokeObjectURL(audio.src);
        console.warn('Timed out while getting audio duration, using default');
        resolve(0);
      }, 3000);
    });
  }

  /**
   * Get file extension from MIME type
   * @param {string} mimeType - MIME type of the audio file
   * @returns {string} File extension
   */
  static getFileExtension(mimeType) {
    switch (mimeType) {
      case 'audio/webm':
        return 'webm';
      case 'audio/ogg':
        return 'ogg';
      case 'audio/mp4':
        return 'm4a';
      case 'audio/wav':
      case 'audio/x-wav':
        return 'wav';
      case 'audio/mpeg':
        return 'mp3';
      default:
        return 'webm'; // Default to webm
    }
  }

  /**
   * Get a recording from Supabase storage
   * @param {string} filePath - Path to the audio file
   * @returns {Promise<Blob>} The audio blob
   */
  static async getRecording(filePath) {
    try {
      // For development/testing only - if filePath is a data URL or object URL, return it
      if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
        const response = await fetch(filePath);
        return await response.blob();
      }

      // Check if Supabase is initialized
      if (!supabase || !supabase.storage) {
        throw new Error('Supabase storage is not initialized');
      }

      const { data, error } = await supabase.storage
        .from('voice-recordings')
        .download(filePath);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error downloading audio:', error);
      throw error;
    }
  }

  /**
   * Delete a recording from Supabase storage
   * @param {string} filePath - Path to the audio file
   * @returns {Promise<void>}
   */
  static async deleteRecording(filePath) {
    try {
      // For development/testing only - if filePath is a data URL or object URL, just return
      if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
        URL.revokeObjectURL(filePath);
        return;
      }

      // Check if Supabase is initialized
      if (!supabase || !supabase.storage) {
        throw new Error('Supabase storage is not initialized');
      }

      const { error } = await supabase.storage
        .from('voice-recordings')
        .remove([filePath]);

      if (error) throw error;

      // Try to delete the record in the audio_logs table, but don't fail if it doesn't work
      try {
        const { error: deleteError } = await supabase
          .from('audio_logs')
          .delete()
          .eq('file_path', filePath);

        if (deleteError) console.warn('Could not delete audio log record:', deleteError);
      } catch (logError) {
        console.warn('Error deleting audio log record:', logError);
      }
    } catch (error) {
      console.error('Error deleting audio:', error);
      throw error;
    }
  }
}

export default AudioService; 