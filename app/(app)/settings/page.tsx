import { Metadata } from "next";
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_USER_SETTINGS, parseUserSettings } from '@/lib/user-settings';

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const settings = parseUserSettings(data) ?? DEFAULT_USER_SETTINGS;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Preferences</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">User settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configure the risk limits and evidence preferences used by your market analysis.
        </p>
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
