"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type ConfigRow = {
  id: number;
  config_key: string;
  name: string;
  country_id: number | null;
  program_code: string | null;
  status: "draft" | "published" | "archived";
  version: number;
  is_active: boolean;
  updated_at: string;
};

type FieldRow = {
  id: number;
  config_id: number;
  field_key: string;
  source: "core" | "custom";
  field_type: string;
  step_key: string;
  order_index: number;
  is_enabled: boolean;
  is_required: boolean;
  options_json: unknown;
  validation_json: unknown;
  mapping_target: string;
};

type ConditionRow = {
  id: number;
  config_id: number;
  target_field_key: string;
  effect: "show" | "hide" | "required" | "optional";
  rule_json: unknown;
};

type TranslationRow = {
  id: number;
  config_id: number;
  field_key: string;
  lang_code: string;
  label: string | null;
  help_text: string | null;
  placeholder: string | null;
  option_labels_json: unknown;
};

type LanguageRow = { language_id: number; language_code: string; language_name: string };
type CountryRow = { country_id: number; country_name: string };

export default function IntakeFormBuilderPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newConfig, setNewConfig] = useState({ config_key: "default", name: "", country_id: "", program_code: "" });
  const [newField, setNewField] = useState({ field_key: "", source: "custom", field_type: "text", step_key: "step_7", order_index: "0", mapping_target: "" });
  const [newCondition, setNewCondition] = useState({ target_field_key: "", effect: "show", rule_json: '{"op":"eq","field":"incidentType","value":"risk"}' });
  const [newTranslation, setNewTranslation] = useState({ field_key: "", lang_code: "en", label: "", help_text: "", placeholder: "", option_labels_json: "{}" });

  const selectedConfig = useMemo(
    () => configs.find((row) => row.id === selectedConfigId) ?? null,
    [configs, selectedConfigId]
  );
  const isSelectedConfigDefaultGlobal = Boolean(
    selectedConfig &&
      selectedConfig.config_key === "default" &&
      selectedConfig.country_id === null &&
      selectedConfig.program_code === null
  );

  const loadAll = async (preferredConfigId?: number | null) => {
    setError(null);
    const [cfgData, langData, countryData] = await Promise.all([
      adminInvoke<{ configs: ConfigRow[] }>("listIntakeFormConfigs"),
      adminInvoke<{ languages: LanguageRow[] }>("listLanguages"),
      adminInvoke<{ countries: CountryRow[] }>("listCountries"),
    ]);
    setConfigs(cfgData.configs);
    setLanguages(langData.languages);
    setCountries(countryData.countries);
    const targetId = preferredConfigId ?? selectedConfigId;
    if (targetId && cfgData.configs.some((row) => row.id === targetId)) {
      setSelectedConfigId(targetId);
    } else if (cfgData.configs.length) {
      setSelectedConfigId(cfgData.configs[0].id);
    } else {
      setSelectedConfigId(null);
    }
    return cfgData.configs;
  };

  const loadConfigDetails = async (configId: number) => {
    const details = await adminInvoke<{
      config: ConfigRow;
      fields: FieldRow[];
      conditions: ConditionRow[];
      translations: TranslationRow[];
    }>("getIntakeFormConfig", { id: configId });
    setFields(details.fields);
    setConditions(details.conditions);
    setTranslations(details.translations);
  };

  useEffect(() => {
    loadAll().catch((err) => setError(err instanceof Error ? err.message : "Failed to load."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedConfigId) return;
    loadConfigDetails(selectedConfigId).catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load config details.")
    );
  }, [selectedConfigId]);

  const runSave = async (fn: () => Promise<void>) => {
    setIsSaving(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard title="Intake Form Builder" description="No-code create-report configurator">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Configurations</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Config key" value={newConfig.config_key} onChange={(event) => setNewConfig((prev) => ({ ...prev, config_key: event.target.value }))} />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Name" value={newConfig.name} onChange={(event) => setNewConfig((prev) => ({ ...prev, name: event.target.value }))} />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={newConfig.country_id} onChange={(event) => setNewConfig((prev) => ({ ...prev, country_id: event.target.value }))}>
              <option value="">All countries</option>
              {countries.map((country) => (
                <option key={country.country_id} value={String(country.country_id)}>{country.country_name}</option>
              ))}
            </select>
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Program (optional)" value={newConfig.program_code} onChange={(event) => setNewConfig((prev) => ({ ...prev, program_code: event.target.value }))} />
            <button type="button" className="rounded-xl bg-[var(--wb-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving || !newConfig.name.trim()} onClick={() => runSave(async () => {
              await adminInvoke("createIntakeFormConfig", {
                config_key: newConfig.config_key,
                name: newConfig.name,
                country_id: newConfig.country_id ? Number(newConfig.country_id) : null,
                program_code: newConfig.program_code || null,
              });
              setNewConfig({ config_key: "default", name: "", country_id: "", program_code: "" });
              await loadAll();
            })}>Create draft</button>
          </div>

          {selectedConfig ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-600">
                Selected: <span className="font-semibold text-slate-900">{selectedConfig.name}</span> ({selectedConfig.config_key} v{selectedConfig.version})
              </p>
              {selectedConfig.status === "published" ? (
                <button
                  type="button"
                  className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-60"
                  disabled={isSaving}
                  onClick={() =>
                    runSave(async () => {
                      await adminInvoke("unpublishIntakeFormConfig", { id: selectedConfig.id });
                      await loadAll(selectedConfig.id);
                      await loadConfigDetails(selectedConfig.id);
                    })
                  }
                >
                  Unpublish
                </button>
              ) : null}
              {!isSelectedConfigDefaultGlobal ? (
                <button
                  type="button"
                  className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                  disabled={isSaving || selectedConfig.status === "published" || selectedConfig.is_active}
                  onClick={() =>
                    runSave(async () => {
                      await adminInvoke("deleteIntakeFormConfig", { id: selectedConfig.id });
                      const nextConfigs = await loadAll();
                      const nextId = nextConfigs[0]?.id ?? null;
                      if (nextId) {
                        await loadConfigDetails(nextId);
                      } else {
                        setFields([]);
                        setConditions([]);
                        setTranslations([]);
                      }
                    })
                  }
                >
                  Remove form
                </button>
              ) : (
                <p className="text-xs text-slate-500">Default form cannot be removed.</p>
              )}
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {configs.map((cfg) => (
              <div key={cfg.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${selectedConfigId === cfg.id ? "border-[var(--wb-navy)] bg-slate-50" : "border-slate-200"}`}>
                <div>
                  <p className="font-semibold text-slate-900">{cfg.name} ({cfg.config_key} v{cfg.version})</p>
                  <p className="text-xs text-slate-500">{cfg.country_id ? `Country #${cfg.country_id}` : "Global"} · {cfg.program_code || "All programs"} · {cfg.status}{cfg.is_active ? " · active" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded border border-slate-200 px-2 py-1 text-xs" onClick={() => setSelectedConfigId(cfg.id)}>Open</button>
                  {cfg.status !== "published" ? (
                    <button type="button" className="rounded bg-[var(--wb-navy)] px-2 py-1 text-xs font-semibold text-white" onClick={() => runSave(async () => {
                      await adminInvoke("publishIntakeFormConfig", { id: cfg.id });
                      await loadAll();
                    })}>Publish</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedConfig ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Fields</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="field_key" value={newField.field_key} onChange={(event) => setNewField((prev) => ({ ...prev, field_key: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="type" value={newField.field_type} onChange={(event) => setNewField((prev) => ({ ...prev, field_type: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="step_key" value={newField.step_key} onChange={(event) => setNewField((prev) => ({ ...prev, step_key: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="order" value={newField.order_index} onChange={(event) => setNewField((prev) => ({ ...prev, order_index: event.target.value }))} />
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-xs" value={newField.source} onChange={(event) => setNewField((prev) => ({ ...prev, source: event.target.value }))}>
                  <option value="custom">custom</option>
                  <option value="core">core</option>
                </select>
                <button type="button" className="rounded-xl bg-[var(--wb-navy)] px-4 py-2 text-xs font-semibold text-white" onClick={() => runSave(async () => {
                  await adminInvoke("upsertIntakeFormField", {
                    config_id: selectedConfig.id,
                    field_key: newField.field_key,
                    source: newField.source,
                    field_type: newField.field_type,
                    step_key: newField.step_key,
                    order_index: Number(newField.order_index) || 0,
                    mapping_target: newField.mapping_target || `intake_payload.custom_fields.${newField.field_key}`,
                  });
                  setNewField({ field_key: "", source: "custom", field_type: "text", step_key: "step_7", order_index: "0", mapping_target: "" });
                  await loadConfigDetails(selectedConfig.id);
                })}>Add</button>
              </div>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto text-xs">
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="font-semibold text-slate-900">{field.field_key}</p>
                      <p className="text-slate-500">{field.step_key} · {field.field_type} · order {field.order_index} · {field.is_enabled ? "enabled" : "disabled"} · {field.is_required ? "required" : "optional"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="rounded border border-slate-200 px-2 py-1" onClick={() => runSave(async () => {
                        await adminInvoke("upsertIntakeFormField", { ...field, config_id: selectedConfig.id, order_index: field.order_index - 10 });
                        await loadConfigDetails(selectedConfig.id);
                      })}>Up</button>
                      <button type="button" className="rounded border border-slate-200 px-2 py-1" onClick={() => runSave(async () => {
                        await adminInvoke("upsertIntakeFormField", { ...field, config_id: selectedConfig.id, order_index: field.order_index + 10 });
                        await loadConfigDetails(selectedConfig.id);
                      })}>Down</button>
                      <button type="button" className="rounded border border-slate-200 px-2 py-1" onClick={() => runSave(async () => {
                        await adminInvoke("upsertIntakeFormField", { ...field, config_id: selectedConfig.id, is_enabled: !field.is_enabled });
                        await loadConfigDetails(selectedConfig.id);
                      })}>{field.is_enabled ? "Disable" : "Enable"}</button>
                      <button type="button" className="rounded border border-slate-200 px-2 py-1" onClick={() => runSave(async () => {
                        await adminInvoke("upsertIntakeFormField", { ...field, config_id: selectedConfig.id, is_required: !field.is_required });
                        await loadConfigDetails(selectedConfig.id);
                      })}>{field.is_required ? "Optional" : "Required"}</button>
                      <button type="button" className="rounded border border-rose-200 px-2 py-1 text-rose-700" onClick={() => runSave(async () => {
                        await adminInvoke("deleteIntakeFormField", { id: field.id });
                        await loadConfigDetails(selectedConfig.id);
                      })}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Conditions</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="target_field_key" value={newCondition.target_field_key} onChange={(event) => setNewCondition((prev) => ({ ...prev, target_field_key: event.target.value }))} />
                  <select className="rounded-xl border border-slate-200 px-3 py-2 text-xs" value={newCondition.effect} onChange={(event) => setNewCondition((prev) => ({ ...prev, effect: event.target.value }))}>
                    <option value="show">show</option>
                    <option value="hide">hide</option>
                    <option value="required">required</option>
                    <option value="optional">optional</option>
                  </select>
                  <button type="button" className="rounded-xl bg-[var(--wb-navy)] px-4 py-2 text-xs font-semibold text-white" onClick={() => runSave(async () => {
                    await adminInvoke("upsertIntakeFormCondition", {
                      config_id: selectedConfig.id,
                      target_field_key: newCondition.target_field_key,
                      effect: newCondition.effect,
                      rule_json: JSON.parse(newCondition.rule_json || "{}"),
                    });
                    await loadConfigDetails(selectedConfig.id);
                  })}>Add</button>
                </div>
                <textarea className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" rows={2} value={newCondition.rule_json} onChange={(event) => setNewCondition((prev) => ({ ...prev, rule_json: event.target.value }))} />
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto text-xs">
                  {conditions.map((condition) => (
                    <div key={condition.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <p>{condition.target_field_key} → {condition.effect}</p>
                      <button type="button" className="rounded border border-rose-200 px-2 py-1 text-rose-700" onClick={() => runSave(async () => {
                        await adminInvoke("deleteIntakeFormCondition", { id: condition.id });
                        await loadConfigDetails(selectedConfig.id);
                      })}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Translations ({translations.length})</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="field_key" value={newTranslation.field_key} onChange={(event) => setNewTranslation((prev) => ({ ...prev, field_key: event.target.value }))} />
                  <select className="rounded-xl border border-slate-200 px-3 py-2 text-xs" value={newTranslation.lang_code} onChange={(event) => setNewTranslation((prev) => ({ ...prev, lang_code: event.target.value }))}>
                    {languages.map((lang) => (
                      <option key={lang.language_id} value={lang.language_code.toLowerCase()}>{lang.language_name}</option>
                    ))}
                  </select>
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="label" value={newTranslation.label} onChange={(event) => setNewTranslation((prev) => ({ ...prev, label: event.target.value }))} />
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="placeholder" value={newTranslation.placeholder} onChange={(event) => setNewTranslation((prev) => ({ ...prev, placeholder: event.target.value }))} />
                </div>
                <textarea className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" rows={2} placeholder="help text" value={newTranslation.help_text} onChange={(event) => setNewTranslation((prev) => ({ ...prev, help_text: event.target.value }))} />
                <button type="button" className="mt-2 rounded-xl bg-[var(--wb-navy)] px-4 py-2 text-xs font-semibold text-white" onClick={() => runSave(async () => {
                  await adminInvoke("upsertIntakeFormTranslation", {
                    config_id: selectedConfig.id,
                    field_key: newTranslation.field_key,
                    lang_code: newTranslation.lang_code,
                    label: newTranslation.label || null,
                    help_text: newTranslation.help_text || null,
                    placeholder: newTranslation.placeholder || null,
                    option_labels_json: JSON.parse(newTranslation.option_labels_json || "{}"),
                  });
                  await loadConfigDetails(selectedConfig.id);
                })}>Save translation</button>
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto text-xs">
                  {translations.map((translation) => (
                    <div key={translation.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <p>{translation.field_key} · {translation.lang_code}</p>
                      <button type="button" className="rounded border border-rose-200 px-2 py-1 text-rose-700" onClick={() => runSave(async () => {
                        await adminInvoke("deleteIntakeFormTranslation", { id: translation.id });
                        await loadConfigDetails(selectedConfig.id);
                      })}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
      </div>
    </SectionCard>
  );
}
