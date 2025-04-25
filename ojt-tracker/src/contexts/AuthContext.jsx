import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for active session on initial load
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking session:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Sign up function
  const signUp = async (email, password, fullName) => {
    try {
      setLoading(true);
      
      // Create the user in Supabase Auth with metadata
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (signUpError) throw signUpError;
      
      // If we get here, the user was created successfully
      // The trigger function should create the profile automatically
      // But let's check if it exists after a brief delay
      if (user) {
        // Wait a moment to allow the trigger to run
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile exists
        const { data: profile, error: profileGetError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        // If no profile exists, create one manually
        if (profileGetError || !profile) {
          const { error: profileInsertError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: user.id, 
                full_name: fullName,
                target_hours: 500
              }
            ]);
          
          if (profileInsertError) {
            console.error('Error creating profile:', profileInsertError);
            // Continue anyway - the user was created successfully
          }
        }
      }
      
      return { user };
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { user };
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (password) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Get user profile
  const getUserProfile = async () => {
    try {
      if (!user) return { profile: null };
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      return { profile };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { error };
    }
  };

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    getUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 