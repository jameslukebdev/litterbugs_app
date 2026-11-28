import { weeklyEmailPreference } from '@litterbugs/report-contract';
import { supabase } from './supabase';

export async function loadWeeklyEmailPreference(userId) {
  if (!userId) throw new Error('Sign in to manage email preferences.');
  const { data, error } = await supabase.rpc('get_weekly_email_preferences');
  if (error) throw new Error('Email preferences are temporarily unavailable. Please try again.');
  return weeklyEmailPreference(data);
}

export async function saveWeeklyEmailPreference(userId, subscribed) {
  if (!userId || typeof subscribed !== 'boolean') throw new Error('Sign in to manage email preferences.');
  const { data, error } = await supabase.rpc('set_weekly_email_preference', { target_subscribed: subscribed });
  if (error) throw new Error('Your email preference was not saved. Please try again.');
  // No device-only fallback: a withdrawal is saved only when the server confirms it.
  return weeklyEmailPreference(data);
}
