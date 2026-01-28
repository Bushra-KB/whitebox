"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { adminInvoke } from "@/lib/adminApi";

type LanguageRow = {
  language_id: number;
  language_code: string;
  language_name: string;
};

type CountryRow = {
  country_id: number;
  country_name: string;
  flag_url: string | null;
};

type CountryLanguageRow = {
  country_id: number;
  language_id: number;
};

type TabKey = "languages" | "countries" | "country_languages";

export default function AdminLanguagesPage() {
  const [rows, setRows] = useState<LanguageRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [countryLanguages, setCountryLanguages] = useState<CountryLanguageRow[]>([]);
  const [tab, setTab] = useState<TabKey>("languages");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCountryName, setNewCountryName] = useState("");
  const [newFlagUrl, setNewFlagUrl] = useState("");
  const [newCountryId, setNewCountryId] = useState("");
  const [newLanguageId, setNewLanguageId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [languagesData, countriesData, countryLanguagesData] = await Promise.all([
          adminInvoke<{ languages: LanguageRow[] }>("listLanguages"),
          adminInvoke<{ countries: CountryRow[] }>("listCountries"),
          adminInvoke<{ country_languages: CountryLanguageRow[] }>("listCountryLanguages"),
        ]);
        if (!isMounted) return;
        setRows(languagesData.languages);
        setCountries(countriesData.countries);
        setCountryLanguages(countryLanguagesData.country_languages);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load languages.");
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { title: "Total languages", value: rows.length.toString(), trend: "Active list" },
      { title: "Unique codes", value: new Set(rows.map((row) => row.language_code)).size.toString(), trend: "Locale coverage" },
      { title: "Drafts", value: "0", trend: "No draft status" },
      { title: "AI auto-translate", value: "Enabled", trend: "Intake only" },
    ],
    [rows]
  );

  const isValidUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const addLanguage = async () => {
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name) {
      setError("Language code and name are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("createLanguage", { language_code: code, language_name: name });
      const refreshed = await adminInvoke<{ languages: LanguageRow[] }>("listLanguages");
      setRows(refreshed.languages);
      setNewCode("");
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add language.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateLanguage = async (id: number, updates: Record<string, unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateLanguage", { language_id: id, ...updates });
      setRows((prev) => prev.map((row) => (row.language_id === id ? { ...row, ...updates } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update language.");
    } finally {
      setIsSaving(false);
    }
  };

  const addCountry = async () => {
    const name = newCountryName.trim();
    if (!name) {
      setError("Country name is required.");
      return;
    }
    if (!isValidUrl(newFlagUrl)) {
      setError("Flag URL must be a valid http(s) URL.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("createCountry", {
        country_name: name,
        flag_url: newFlagUrl.trim() || null,
      });
      const refreshed = await adminInvoke<{ countries: CountryRow[] }>("listCountries");
      setCountries(refreshed.countries);
      setNewCountryName("");
      setNewFlagUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add country.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateCountry = async (id: number, updates: Record<string, unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateCountry", { country_id: id, ...updates });
      setCountries((prev) =>
        prev.map((row) => (row.country_id === id ? { ...row, ...updates } : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update country.");
    } finally {
      setIsSaving(false);
    }
  };

  const addCountryLanguage = async () => {
    if (!newCountryId || !newLanguageId) {
      setError("Country and language are required.");
      return;
    }
    const countryId = Number(newCountryId);
    const languageId = Number(newLanguageId);
    const exists = countryLanguages.some(
      (row) => row.country_id === countryId && row.language_id === languageId
    );
    if (exists) {
      setError("This country-language mapping already exists.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("createCountryLanguage", {
        country_id: countryId,
        language_id: languageId,
      });
      const refreshed = await adminInvoke<{ country_languages: CountryLanguageRow[] }>(
        "listCountryLanguages"
      );
      setCountryLanguages(refreshed.country_languages);
      setNewCountryId("");
      setNewLanguageId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add mapping.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCountryLanguage = async (countryId: number, languageId: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("deleteCountryLanguage", {
        country_id: countryId,
        language_id: languageId,
      });
      setCountryLanguages((prev) =>
        prev.filter(
          (row) => !(row.country_id === countryId && row.language_id === languageId)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove mapping.");
    } finally {
      setIsSaving(false);
    }
  };

  const countryNameById = useMemo(
    () => Object.fromEntries(countries.map((row) => [row.country_id, row.country_name])),
    [countries]
  );

  const languageNameById = useMemo(
    () => Object.fromEntries(rows.map((row) => [row.language_id, row.language_name])),
    [rows]
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} trend={item.trend} />
        ))}
      </div>

      <SectionCard
        title="Countries & Languages"
        description="Manage platform countries, languages, and locale defaults."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "languages", label: "Languages" },
              { key: "countries", label: "Countries" },
              { key: "country_languages", label: "Country languages" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  tab === item.key
                    ? "bg-[var(--wb-cobalt)] text-white"
                    : "border border-slate-200 text-slate-600"
                }`}
                onClick={() => setTab(item.key as TabKey)}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        {tab === "languages" ? (
          <>
            <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_2fr_auto]">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Locale code (e.g., en-US)"
                value={newCode}
                onChange={(event) => setNewCode(event.target.value)}
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Language name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <button
                type="button"
                className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
                onClick={addLanguage}
                disabled={isSaving}
              >
                Add
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.language_id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.language_code}</td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          value={row.language_name}
                          onChange={(event) =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.language_id === row.language_id
                                  ? { ...item, language_name: event.target.value }
                                  : item
                              )
                            )
                          }
                          onBlur={(event) =>
                            updateLanguage(row.language_id, { language_name: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          onClick={() =>
                            updateLanguage(row.language_id, { language_code: row.language_code })
                          }
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "countries" ? (
          <>
            <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1.5fr_2fr_auto]">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Country name"
                value={newCountryName}
                onChange={(event) => setNewCountryName(event.target.value)}
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Flag URL (optional)"
                value={newFlagUrl}
                onChange={(event) => setNewFlagUrl(event.target.value)}
              />
              <button
                type="button"
                className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
                onClick={addCountry}
                disabled={isSaving}
              >
                Add
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Flag URL</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((row) => (
                    <tr key={row.country_id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          value={row.country_name}
                          onChange={(event) =>
                            setCountries((prev) =>
                              prev.map((item) =>
                                item.country_id === row.country_id
                                  ? { ...item, country_name: event.target.value }
                                  : item
                              )
                            )
                          }
                          onBlur={(event) =>
                            updateCountry(row.country_id, { country_name: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          value={row.flag_url ?? ""}
                          onChange={(event) =>
                            setCountries((prev) =>
                              prev.map((item) =>
                                item.country_id === row.country_id
                                  ? { ...item, flag_url: event.target.value }
                                  : item
                              )
                            )
                          }
                          onBlur={(event) =>
                            updateCountry(row.country_id, { flag_url: event.target.value || null })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          onClick={() =>
                            updateCountry(row.country_id, {
                              country_name: row.country_name,
                              flag_url: row.flag_url,
                            })
                          }
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={newCountryId}
                onChange={(event) => setNewCountryId(event.target.value)}
              >
                <option value="">Select country</option>
                {countries.map((row) => (
                  <option key={row.country_id} value={row.country_id}>
                    {row.country_name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={newLanguageId}
                onChange={(event) => setNewLanguageId(event.target.value)}
              >
                <option value="">Select language</option>
                {rows.map((row) => (
                  <option key={row.language_id} value={row.language_id}>
                    {row.language_name} ({row.language_code})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
                onClick={addCountryLanguage}
                disabled={isSaving}
              >
                Add
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {countryLanguages.map((row) => (
                    <tr key={`${row.country_id}-${row.language_id}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {countryNameById[row.country_id] ?? row.country_id}
                      </td>
                      <td className="px-4 py-3">
                        {languageNameById[row.language_id] ?? row.language_id}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-full border border-rose-200 px-2 py-1 text-[11px] text-rose-500"
                          onClick={() => deleteCountryLanguage(row.country_id, row.language_id)}
                          disabled={isSaving}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
