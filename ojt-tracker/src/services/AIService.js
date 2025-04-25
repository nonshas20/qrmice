import { supabase } from '../lib/supabase';

/**
 * Service for handling AI-powered features
 */
class AIService {
  // Default API keys (for development only)
  static OPENAI_API_KEY = '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';
  static GEMINI_API_KEY = 'AIzaSyAJSe8P9Q9dPMdvmYfwuwKqbsJ1kCiM2Dg';
  
  // API endpoints
  static OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  static GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash';
  
  // Default AI provider
  static DEFAULT_PROVIDER = 'gemini'; // 'openai' or 'gemini'

  /**
   * Generate an AI-powered summary based on daily logs
   * @param {Object} weekData - Data containing daily breakdown and total hours
   * @param {string} provider - AI provider to use ('openai' or 'gemini')
   * @returns {Promise<string>} The generated summary
   */
  static async generateSummary(weekData, provider = this.DEFAULT_PROVIDER) {
    try {
      if (!weekData || !weekData.dailyBreakdown || weekData.dailyBreakdown.length === 0) {
        throw new Error('No daily logs data provided');
      }

      // Prepare input for the AI model
      const weekRange = `${new Date(weekData.weekStart).toLocaleDateString()} - ${new Date(weekData.weekEnd).toLocaleDateString()}`;
      const totalHours = weekData.weeklyHours.toFixed(2);
      
      // Format daily activities for the prompt
      let dailyActivitiesText = '';
      weekData.dailyBreakdown.forEach(day => {
        if (day.hasLog && day.hours > 0) {
          dailyActivitiesText += `- ${day.formattedDate}: ${day.hours} hours\n`;
          if (day.notes && day.notes.trim()) {
            dailyActivitiesText += `  Activities: ${day.notes}\n`;
          }
        }
      });

      // Create the prompt for the AI
      const prompt = `Please generate a professional weekly summary for my On-the-Job Training (OJT) journal based on the following information:

Week: ${weekRange}
Total Hours: ${totalHours} hours

Daily Activities:
${dailyActivitiesText}

Format the summary as a professional reflection of my week, including:
1. An introduction mentioning the week and total hours
2. A summary of the key activities and skills practiced
3. Observations or learnings from the week
4. A professional conclusion

Keep it concise but thorough (about 250-300 words).`;

      // Force using Gemini as OpenAI is not working
      return await this.callGemini(prompt);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw error;
    }
  }
  
  /**
   * Call the OpenAI API
   * @param {string} prompt - The prompt to send to the API
   * @returns {Promise<string>} The generated text
   * @private
   */
  static async callOpenAI(prompt) {
    const response = await fetch(this.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional assistant helping a student write their OJT weekly journal summary. Write in a professional first-person perspective.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 700
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate AI summary with OpenAI');
    }

    // Return the generated text
    return data.choices[0].message.content.trim();
  }
  
  /**
   * Call the Google Gemini API
   * @param {string} prompt - The prompt to send to the API
   * @returns {Promise<string>} The generated text
   * @private
   */
  static async callGemini(prompt) {
    const url = `${this.GEMINI_API_URL}:generateContent?key=${this.GEMINI_API_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'You are a professional assistant helping a student write their OJT weekly journal summary. Write in a professional first-person perspective.'
                }
              ]
            },
            {
              role: 'model',
              parts: [
                {
                  text: "I understand. I'll help you write a professional weekly journal summary from a first-person perspective. Please provide me with the details of your week."
                }
              ]
            },
            {
              role: 'user',
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.95,
            topK: 64
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Gemini API error:', data);
        throw new Error(data.error?.message || 'Failed to generate AI summary with Gemini');
      }

      // Return the generated text
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error(`Failed to generate summary with Gemini: ${error.message}`);
    }
  }

  /**
   * Save the API keys to the user's settings in Supabase
   * @param {string} userId - The user ID
   * @param {Object} keys - Object containing API keys
   * @param {string} keys.openai_api_key - The OpenAI API key (optional)
   * @param {string} keys.gemini_api_key - The Google Gemini API key (optional)
   * @param {string} keys.preferred_provider - The preferred AI provider (optional)
   * @returns {Promise<void>}
   */
  static async saveApiKeys(userId, keys) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get existing settings
      const { data: existingData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Merge with existing settings
      const updatedSettings = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...(existingData || {}),
        ...(keys.openai_api_key && { openai_api_key: keys.openai_api_key }),
        ...(keys.gemini_api_key && { gemini_api_key: keys.gemini_api_key }),
        ...(keys.preferred_provider && { preferred_provider: keys.preferred_provider })
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert([updatedSettings]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving API keys:', error);
      throw error;
    }
  }

  /**
   * Save the API key to the user's settings in Supabase (Legacy method)
   * @param {string} userId - The user ID
   * @param {string} apiKey - The OpenAI API key
   * @returns {Promise<void>}
   */
  static async saveApiKey(userId, apiKey) {
    try {
      if (!userId || !apiKey) {
        throw new Error('User ID and API key are required');
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert([
          {
            user_id: userId,
            openai_api_key: apiKey,
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  }

  /**
   * Get the saved API keys and settings for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} The saved API keys and settings
   */
  static async getUserSettings(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('openai_api_key, gemini_api_key, preferred_provider')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

      return {
        openai_api_key: data?.openai_api_key || null,
        gemini_api_key: data?.gemini_api_key || null,
        preferred_provider: data?.preferred_provider || this.DEFAULT_PROVIDER
      };
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {
        openai_api_key: null,
        gemini_api_key: null,
        preferred_provider: this.DEFAULT_PROVIDER
      };
    }
  }

  /**
   * Get the saved API key for a user (Legacy method)
   * @param {string} userId - The user ID
   * @returns {Promise<string|null>} The saved API key or null if not found
   */
  static async getApiKey(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('openai_api_key')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

      return data?.openai_api_key || null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }
}

export default AIService; 