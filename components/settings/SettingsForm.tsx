'use client';

import { useState } from 'react';
import { Check, Loader2, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ANALYSIS_COMPONENTS,
  RISK_PROFILES,
  SESSIONS,
  TIMEFRAMES,
  type AnalysisComponentKey,
  type UserSettings,
} from '@/lib/user-settings';

interface SettingsFormProps {
  initialSettings: UserSettings;
}

const riskProfileLabels: Record<UserSettings['risk_profile'], string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
};

const sessionLabels: Record<UserSettings['preferred_sessions'][number], string> = {
  asian: 'Asian',
  london: 'London',
  new_york: 'New York',
  overlap: 'London / New York overlap',
};

const timeframeLabels: Record<UserSettings['preferred_timeframes'][number], string> = {
  '1m': '1 minute',
  '5m': '5 minutes',
  '15m': '15 minutes',
  '1h': '1 hour',
  '4h': '4 hours',
  '1d': '1 day',
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border/60 py-7 last:border-b-0">
      <div className="mb-5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<UserSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const toggleArrayValue = <K extends 'preferred_timeframes' | 'preferred_sessions'>(
    key: K,
    value: UserSettings[K][number],
  ) => {
    const currentValues = settings[key] as readonly UserSettings[K][number][];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    updateSetting(key, nextValues as UserSettings[K]);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not save your settings.');
      }

      setSettings(result.settings);
      setSavedSettings(result.settings);
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not save your settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="glass rounded-xl border border-border/60 px-5 md:px-8">
      <Section title="Risk settings" description="Set the constraints used when evaluating potential setups. These preferences do not guarantee results.">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="risk-profile">Risk profile</Label>
            <select
              id="risk-profile"
              value={settings.risk_profile}
              onChange={(event) => updateSetting('risk_profile', event.target.value as UserSettings['risk_profile'])}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {RISK_PROFILES.map((profile) => <option key={profile} value={profile}>{riskProfileLabels[profile]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="risk-per-trade">Risk per trade (%)</Label>
            <Input
              id="risk-per-trade"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={settings.risk_per_trade}
              onChange={(event) => updateSetting('risk_per_trade', Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimum-risk-reward">Minimum risk / reward</Label>
            <Input
              id="minimum-risk-reward"
              type="number"
              min="0.01"
              step="0.01"
              value={settings.minimum_risk_reward}
              onChange={(event) => updateSetting('minimum_risk_reward', Number(event.target.value))}
            />
          </div>
        </div>
      </Section>

      <Section title="Analysis preferences" description="Choose the markets and evidence you want the analysis process to prioritize.">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-medium">Preferred timeframes</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TIMEFRAMES.map((timeframe) => (
                <label key={timeframe} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={settings.preferred_timeframes.includes(timeframe)}
                    onCheckedChange={() => toggleArrayValue('preferred_timeframes', timeframe)}
                  />
                  {timeframeLabels[timeframe]}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Select at least one timeframe.</p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Preferred sessions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SESSIONS.map((session) => (
                <label key={session} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={settings.preferred_sessions.includes(session)}
                    onCheckedChange={() => toggleArrayValue('preferred_sessions', session)}
                  />
                  {sessionLabels[session]}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Select at least one session.</p>
          </div>
        </div>

        <label className="mt-8 flex items-start gap-3 rounded-lg border border-border/60 p-4">
          <Checkbox
            checked={settings.require_multi_timeframe_confirmation}
            onCheckedChange={(checked) => updateSetting('require_multi_timeframe_confirmation', checked === true)}
          />
          <span>
            <span className="block text-sm font-medium">Require multi-timeframe confirmation</span>
            <span className="mt-1 block text-xs text-muted-foreground">Require agreement from the wider market context before accepting a directional setup.</span>
          </span>
        </label>

        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium">Enabled analysis components</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {ANALYSIS_COMPONENTS.map((component) => (
              <label key={component.key} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <Checkbox
                  checked={settings[component.key]}
                  onCheckedChange={(checked) => updateSetting(component.key as AnalysisComponentKey, checked === true)}
                />
                <span>
                  <span className="block text-sm font-medium">{component.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{component.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Screenshot analysis" description="Control whether uploaded chart screenshots can be included as supplementary evidence.">
        <label className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
          <Checkbox
            checked={settings.screenshot_analysis_enabled}
            onCheckedChange={(checked) => updateSetting('screenshot_analysis_enabled', checked === true)}
          />
          <span>
            <span className="block text-sm font-medium">Allow screenshot analysis</span>
            <span className="mt-1 block text-xs text-muted-foreground">Application-generated chart analysis remains available when this is disabled.</span>
          </span>
        </label>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 py-5">
        <div aria-live="polite" className="flex items-center gap-2 text-sm">
          {message?.type === 'success' && <Check className="size-4 text-emerald-500" />}
          {message?.type === 'error' && <ShieldCheck className="size-4 text-destructive" />}
          <span className={message?.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{message?.text}</span>
        </div>
        <Button type="submit" disabled={isSaving || !isDirty} className="gap-2">
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
