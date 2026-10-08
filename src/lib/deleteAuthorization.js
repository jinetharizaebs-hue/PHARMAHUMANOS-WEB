import { supabase } from './supabase';

const privilegedRoles = ['admin', 'superadmin'];

export const reauthenticatePrivilegedUser = async (password) => {
  const candidate = String(password ?? '').trim();
  if (!candidate) return false;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user?.email || !privilegedRoles.includes(userData.user.app_metadata?.role)) {
    return false;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: candidate
  });
  if (error) {
    if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
      return false;
    }
    throw error;
  }

  return privilegedRoles.includes(data.user?.app_metadata?.role);
};
