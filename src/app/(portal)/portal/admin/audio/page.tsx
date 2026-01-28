"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type SettingRow = { key: string; value: unknown };

export default function AdminAudioPage() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [defaultVoice, setDefaultVoice] = useState("neutral");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ settings: SettingRow[] }>("getPlatformSettings")
      .then((data) => {
        if (!isMounted) return;
        const map = new Map(data.settings.map((row) => [row.key, row.value]));
        setAudioEnabled(Boolean(map.get("audio_enabled") ?? true));
        setDefaultVoice(String(map.get("audio_voice") ?? "neutral"));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load audio settings.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const saveSetting = async (key: string, value: unknown) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updatePlatformSettings", { key, value });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update setting.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard title="Audio" description="Configure text-to-speech and accessibility audio settings.">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Enable audio playback</p>
            <p className="text-xs text-slate-500">Allow reporters to listen to form content.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              saveSetting("audio_enabled", next);
            }}
            disabled={isSaving}
          >
            {audioEnabled ? "On" : "Off"}
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Default voice</p>
            <p className="text-xs text-slate-500">Set the primary narration voice.</p>
          </div>
          <select
            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            value={defaultVoice}
            onChange={(event) => {
              setDefaultVoice(event.target.value);
              saveSetting("audio_voice", event.target.value);
            }}
            disabled={isSaving}
          >
            <option value="neutral">Neutral</option>
            <option value="warm">Warm</option>
            <option value="clear">Clear</option>
          </select>
        </div>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
