'use client';

import { weeklyEmailPreference, weeklyEmailRecipients } from '@litterbugs/report-contract';
import { createClient } from './supabase/client';

export async function loadWeeklyEmailPreference() {
  const { data, error } = await createClient().rpc('get_weekly_email_preferences');
  if (error) throw new Error('Email preferences are temporarily unavailable. Please try again.');
  return weeklyEmailPreference(data);
}

export async function saveWeeklyEmailPreference(subscribed: boolean) {
  const { data, error } = await createClient().rpc('set_weekly_email_preference', { target_subscribed: subscribed });
  if (error) throw new Error('Your email preference was not saved. Please try again.');
  return weeklyEmailPreference(data);
}

export async function loadWeeklyEmailRecipients() {
  const { data, error } = await createClient().rpc('admin_weekly_email_recipients');
  if (error) throw new Error('The email list is unavailable. Refresh your admin session and try again.');
  return weeklyEmailRecipients(data);
}
