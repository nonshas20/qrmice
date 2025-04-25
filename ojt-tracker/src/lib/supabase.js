import { createClient } from '@supabase/supabase-js';

// Get environment variables for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Development fallbacks
const devUrl = 'https://your-project.supabase.co';
const devKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdWdhYWZrYWh6ZWxja3dpam5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDcyNjI2OTcsImV4cCI6MTk2MjgzODY5N30.DUMMY_KEY';

// Create Supabase client with fallbacks for development
export const supabase = createClient(
  supabaseUrl || devUrl, 
  supabaseAnonKey || devKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Add a helper function to log Supabase errors with more context
export const logSupabaseError = (error, operation = 'unknown', details = {}) => {
  if (!error) return;
  
  console.error(`Supabase error during ${operation}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    ...details
  });
  
  // If it's a permission error, log additional diagnostic info
  if (error.code === '42501' || (error.message && error.message.includes('permission denied'))) {
    console.error('Permission denied error detected. This might be due to missing RLS policies.');
  }
  
  return error;
};

// Check for RLS policies - this can be called to diagnose permission issues
export const checkRLSPolicies = async (table) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    
    // Test a basic operation with logging
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      logSupabaseError(error, `checking RLS on ${table}`, { user: user?.id });
      return {
        success: false,
        message: `Failed to access ${table}: ${error.message}`,
        error
      };
    }
    
    return {
      success: true,
      message: `Successfully accessed ${table}`,
      data
    };
  } catch (error) {
    logSupabaseError(error, `checking RLS on ${table}`);
    return {
      success: false,
      message: `Error checking policies: ${error.message}`,
      error
    };
  }
};

// Comprehensive diagnostic check of Supabase client health
export const checkSupabaseHealth = async () => {
  const diagnostics = {
    configuration: {
      url: supabaseUrl ? 'Configured' : 'Missing',
      key: supabaseAnonKey ? 'Configured' : 'Missing',
      usingDevFallbacks: !isProperlyConfigured
    },
    connectivity: 'Checking...',
    auth: 'Checking...',
    database: {},
    tests: {}
  };
  
  // Test connectivity
  try {
    const start = Date.now();
    await fetch(supabaseUrl || devUrl);
    diagnostics.connectivity = {
      status: 'Connected',
      latency: `${Date.now() - start}ms`
    };
  } catch (error) {
    diagnostics.connectivity = {
      status: 'Failed',
      error: error.message
    };
  }
  
  // Test auth
  try {
    const { data: session, error } = await supabase.auth.getSession();
    if (error) {
      diagnostics.auth = {
        status: 'Error',
        error: error.message
      };
    } else {
      diagnostics.auth = {
        status: 'OK',
        authenticated: !!session?.user,
        user: session?.user?.id
      };
    }
  } catch (error) {
    diagnostics.auth = {
      status: 'Failed',
      error: error.message
    };
  }
  
  // Test key tables
  const tables = ['profiles', 'daily_logs', 'weekly_journals'];
  for (const table of tables) {
    try {
      const result = await checkRLSPolicies(table);
      diagnostics.database[table] = result;
    } catch (error) {
      diagnostics.database[table] = {
        status: 'Error',
        error: error.message
      };
    }
  }
  
  // Test specific operations
  // 1. Test DELETE permission
  if (diagnostics.auth.authenticated) {
    try {
      // Create a test record (that we'll delete immediately)
      const { data: testData, error: insertError } = await supabase
        .from('daily_logs')
        .insert({
          user_id: diagnostics.auth.user,
          date: new Date().toISOString().slice(0, 10),
          hours_worked: 0.1,
          notes: 'Test record - safe to delete'
        })
        .select();
      
      if (insertError) {
        diagnostics.tests.delete = {
          status: 'Failed at insert step',
          error: insertError.message
        };
      } else if (testData && testData.length > 0) {
        // Now try to delete it
        const { error: deleteError } = await supabase
          .from('daily_logs')
          .delete()
          .eq('id', testData[0].id)
          .eq('user_id', diagnostics.auth.user);
        
        if (deleteError) {
          diagnostics.tests.delete = {
            status: 'Failed at delete step',
            error: deleteError.message
          };
        } else {
          diagnostics.tests.delete = {
            status: 'Success',
            message: 'Successfully created and deleted a test record'
          };
        }
      }
    } catch (error) {
      diagnostics.tests.delete = {
        status: 'Error',
        error: error.message
      };
    }
  }
  
  console.log('Supabase Health Check Results:', diagnostics);
  return diagnostics;
};

// Check if Supabase is properly configured
const isProperlyConfigured = supabaseUrl && supabaseAnonKey;

// Log a warning if using development defaults
if (!isProperlyConfigured && process.env.NODE_ENV !== 'production') {
  console.warn(
    'Warning: Using development fallbacks for Supabase. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file for full functionality.'
  );
}

export const isSupabaseConfigured = isProperlyConfigured; 