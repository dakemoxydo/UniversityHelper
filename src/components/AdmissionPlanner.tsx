"use client";

import {
  calculateRatedSpecialties,
  criteriaDescriptions,
  criteriaLabels,
  defaultWeights,
  hundredPointBenefitApproximation,
  olympiadBenefitLabels,
  type CriteriaKey,
  type OlympiadBenefit,
  type RatedSpecialty,
  type SpecialtyInput,
  type University,
  type UniversityInput,
  type Weights,
} from "@/lib/university-calculator";
import { FormEvent, useEffect, useMemo, useState } from "react";

const criteriaKeys: CriteriaKey[] = ["admission", "fit", "logistics", "finance", "support"];
const localStorageKey = "university-helper-draft-v2";

const weightPresets: Record<string, Weights> = {
  "Сбалансировано": defaultWeights,
  "Поступить любой ценой": { admission: 65, fit: 10, logistics: 5, finance: 15, support: 5 },
  "Дешевле": { admission: 30, fit: 15, logistics: 10, finance: 35, support: 10 },
  "Ближе и удобнее": { admission: 30, fit: 15, logistics: 35, finance: 10, support: 10 },
  "Карьера и интерес": { admission: 30, fit: 40, logistics: 10, finance: 10, support: 10 },
};

const emptySpecialty = (): SpecialtyInput => ({
  name: "",
  passingScore: 0,
  tuitionCost: 0,
  budgetSeats: 0,
  paidSeats: 0,
  interestScore: 3,
  careerScore: 3,
});

const createEmptyDraft = (): UniversityInput => ({
  name: "",
  city: "",
  hasMilitaryDepartment: false,
  hasDormitory: false,
  commuteMinutes: 45,
  olympiadBenefit: "none",
  extraPoints: 0,
  specialties: [emptySpecialty()],
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function recommendationLabel(value: RatedSpecialty["recommendation"]) {
  if (value === "strong") {
    return "сильный вариант";
  }

  if (value === "balanced") {
    return "реалистичный вариант";
  }

  return "рискованный вариант";
}

function recommendationClass(value: RatedSpecialty["recommendation"]) {
  if (value === "strong") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (value === "balanced") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-amber-50 text-amber-800 border-amber-200";
}

function scoreTone(score: number) {
  if (score >= 80) {
    return "bg-emerald-600";
  }

  if (score >= 60) {
    return "bg-blue-600";
  }

  if (score >= 40) {
    return "bg-amber-500";
  }

  return "bg-rose-600";
}

function distributeWeights(current: Weights, changedKey: CriteriaKey, nextValue: number): Weights {
  const safeValue = Math.max(0, Math.min(100, Math.round(nextValue)));
  const otherKeys = criteriaKeys.filter((key) => key !== changedKey);
  const remaining = 100 - safeValue;
  const currentOtherTotal = otherKeys.reduce((sum, key) => sum + current[key], 0);
  const nextWeights = { ...current, [changedKey]: safeValue };
  let used = 0;

  otherKeys.forEach((key, index) => {
    const value =
      index === otherKeys.length - 1
        ? remaining - used
        : Math.round(currentOtherTotal === 0 ? remaining / otherKeys.length : (current[key] / currentOtherTotal) * remaining);

    nextWeights[key] = value;
    used += value;
  });

  return nextWeights;
}

function cleanDraft(draft: UniversityInput): UniversityInput {
  return {
    ...draft,
    name: draft.name.trim(),
    city: draft.city.trim(),
    commuteMinutes: Math.max(0, Math.min(360, Math.round(Number(draft.commuteMinutes) || 0))),
    extraPoints: Math.max(0, Math.min(25, Math.round(Number(draft.extraPoints) || 0))),
    specialties: draft.specialties
      .map((specialty) => ({
        ...specialty,
        name: specialty.name.trim(),
        passingScore: Math.max(0, Math.min(400, Math.round(Number(specialty.passingScore) || 0))),
        tuitionCost: Math.max(0, Math.min(5_000_000, Math.round(Number(specialty.tuitionCost) || 0))),
        budgetSeats: Math.max(0, Math.min(10_000, Math.round(Number(specialty.budgetSeats) || 0))),
        paidSeats: Math.max(0, Math.min(10_000, Math.round(Number(specialty.paidSeats) || 0))),
        interestScore: Math.max(1, Math.min(5, Math.round(Number(specialty.interestScore) || 3))),
        careerScore: Math.max(1, Math.min(5, Math.round(Number(specialty.careerScore) || 3))),
      }))
      .filter((specialty) => specialty.name.length > 0),
  };
}

function readLocalUniversities() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    return raw ? ((JSON.parse(raw) as University[]) ?? []) : [];
  } catch {
    return [];
  }
}

function SpecialtyFields({
  specialty,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  specialty: SpecialtyInput;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<SpecialtyInput>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Направление {index + 1}</h3>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
            Удалить
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Название специальности</span>
          <input
            value={specialty.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Например, Прикладная информатика"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <NumberField label="Проходной балл" value={specialty.passingScore} min={0} max={400} onChange={(value) => onChange({ passingScore: value })} />
        <NumberField label="Стоимость в год" value={specialty.tuitionCost} min={0} max={5_000_000} step={1000} onChange={(value) => onChange({ tuitionCost: value })} />
        <NumberField label="Бюджетные места" value={specialty.budgetSeats} min={0} max={10_000} onChange={(value) => onChange({ budgetSeats: value })} />
        <NumberField label="Платные места" value={specialty.paidSeats} min={0} max={10_000} onChange={(value) => onChange({ paidSeats: value })} />

        <ScaleField label="Мой интерес" value={specialty.interestScore} onChange={(value) => onChange({ interestScore: value })} />
        <ScaleField label="Карьера" value={specialty.careerScore} onChange={(value) => onChange({ careerScore: value })} />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function ScaleField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-950">{value}/5</span>
      </div>
      <input type="range" min={1} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-blue-600" />
    </label>
  );
}

function SpecialtyCard({ item, onDeleteUniversity }: { item: RatedSpecialty; onDeleteUniversity: (id: number) => void }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 ${scoreTone(item.score)}`} />
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.university.name}</span>
              {item.university.city && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.university.city}</span>}
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${recommendationClass(item.recommendation)}`}>{recommendationLabel(item.recommendation)}</span>
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{item.specialty.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Проходной: {item.specialty.passingScore} · Бюджетных мест: {item.specialty.budgetSeats} · Платное: {formatCurrency(item.specialty.tuitionCost)} · Дорога: {item.university.commuteMinutes} мин.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-72">
            <div className="rounded-lg bg-slate-950 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Итог</p>
              <p className="mt-1 text-4xl font-black">{item.score}</p>
              <p className="text-xs text-slate-400">из 100</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-slate-700">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Баллы</p>
              <p className="mt-1 text-lg font-black text-slate-950">{item.effectiveExamScore === null ? "БВИ" : item.effectiveExamScore}</p>
              <p className="text-xs text-slate-500">с учетом льгот</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {criteriaKeys.map((key) => (
            <div key={key} className="rounded-lg bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-700">{criteriaLabels[key]}</span>
                <span className="font-black text-slate-950">{formatPercent(item.criteria[key])}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.criteria[key]}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-slate-950">Почему подходит</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {(item.strengths.length ? item.strengths : ["сбалансированный набор критериев"]).map((text) => (
                <li key={text}>+ {text}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950">Что проверить</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {(item.risks.length ? item.risks : ["уточнить актуальные проходные баллы приемной кампании"]).map((text) => (
                <li key={text}>- {text}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            Льгота: {olympiadBenefitLabels[item.university.olympiadBenefit]} · Общежитие: {item.university.hasDormitory ? "есть" : "нет"} · ВУЦ: {item.university.hasMilitaryDepartment ? "есть" : "нет"}
          </p>
          <button type="button" onClick={() => onDeleteUniversity(item.university.id)} className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
            Удалить ВУЗ
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdmissionPlanner() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [userExamScore, setUserExamScore] = useState(260);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<UniversityInput>(createEmptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const ratedSpecialties = useMemo(() => calculateRatedSpecialties(universities, userExamScore, weights), [universities, userExamScore, weights]);
  const topSpecialty = ratedSpecialties[0];
  const totalWeight = criteriaKeys.reduce((sum, key) => sum + weights[key], 0);

  useEffect(() => {
    async function loadUniversities() {
      try {
        const response = await fetch("/api/universities", { cache: "no-store" });
        const data = (await response.json()) as { universities?: University[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось загрузить университеты.");
        }

        setUniversities(data.universities ?? []);
        setIsLocalMode(false);
      } catch (loadError) {
        setUniversities(readLocalUniversities());
        setIsLocalMode(true);
        setError(loadError instanceof Error ? `${loadError.message} Данные будут сохранены локально в браузере.` : "Работаем в локальном режиме.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadUniversities();
  }, []);

  useEffect(() => {
    if (isLocalMode && !isLoading) {
      window.localStorage.setItem(localStorageKey, JSON.stringify(universities));
    }
  }, [isLocalMode, isLoading, universities]);

  function updateDraft(patch: Partial<UniversityInput>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function updateSpecialty(index: number, patch: Partial<SpecialtyInput>) {
    setDraft((current) => ({
      ...current,
      specialties: current.specialties.map((specialty, specialtyIndex) => (specialtyIndex === index ? { ...specialty, ...patch } : specialty)),
    }));
    setError(null);
  }

  function addSpecialty() {
    setDraft((current) => ({ ...current, specialties: [...current.specialties, emptySpecialty()].slice(0, 8) }));
  }

  function removeSpecialty(index: number) {
    setDraft((current) => ({ ...current, specialties: current.specialties.filter((_, specialtyIndex) => specialtyIndex !== index) }));
  }

  function validateDraft(cleanedDraft: UniversityInput) {
    if (cleanedDraft.name.length < 2) {
      return "Введите название университета.";
    }

    if (cleanedDraft.specialties.length === 0) {
      return "Добавьте хотя бы одно направление.";
    }

    return null;
  }

  function createLocalUniversity(cleanedDraft: UniversityInput): University {
    const universityId = Date.now();

    return {
      ...cleanedDraft,
      id: universityId,
      createdAt: new Date().toISOString(),
      specialties: cleanedDraft.specialties.map((specialty, index) => ({ ...specialty, id: universityId + index + 1, universityId })),
    };
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedDraft = cleanDraft(draft);
    const validationError = validateDraft(cleanedDraft);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isLocalMode) {
        setUniversities((current) => [createLocalUniversity(cleanedDraft), ...current]);
      } else {
        const response = await fetch("/api/universities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedDraft),
        });
        const data = (await response.json()) as { university?: University; error?: string };

        if (!response.ok || !data.university) {
          throw new Error(data.error ?? "Не удалось сохранить университет.");
        }

        setUniversities((current) => [data.university as University, ...current]);
      }

      setDraft(createEmptyDraft());
      setIsFormOpen(false);
    } catch (saveError) {
      const localUniversity = createLocalUniversity(cleanedDraft);
      setUniversities((current) => [localUniversity, ...current]);
      setIsLocalMode(true);
      setError(saveError instanceof Error ? `${saveError.message} Вариант сохранен локально.` : "Вариант сохранен локально.");
      setDraft(createEmptyDraft());
      setIsFormOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUniversity(id: number) {
    const previous = universities;
    setUniversities((current) => current.filter((university) => university.id !== id));

    if (isLocalMode) {
      return;
    }

    try {
      const response = await fetch(`/api/universities?id=${id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Не удалось удалить университет.");
      }
    } catch (deleteError) {
      setUniversities(previous);
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить университет.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Многокритериальный калькулятор</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Выбор университета в цифрах, а не в догадках</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Добавьте университеты и направления, задайте свои баллы, стоимость, дорогу, бюджетные места и личный интерес. Калькулятор нормализует критерии, применит веса и соберет честный топ вариантов для поступления.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setIsFormOpen(true)} className="rounded-lg bg-slate-950 px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-700">
                Добавить университет
              </button>
              <a href="#ratings" className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-center text-base font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
                Смотреть рейтинг
              </a>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-300">Профиль абитуриента</p>
            <label className="mt-5 block">
              <span className="text-sm text-slate-300">Суммарный балл ЕГЭ</span>
              <input
                type="number"
                min={0}
                max={400}
                value={userExamScore}
                onChange={(event) => setUserExamScore(Math.max(0, Math.min(400, Number(event.target.value) || 0)))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-4 text-3xl font-black text-white outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-400/20"
              />
            </label>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-2xl font-black">{universities.length}</p>
                <p className="text-xs text-slate-400">ВУЗов</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-2xl font-black">{ratedSpecialties.length}</p>
                <p className="text-xs text-slate-400">Направлений</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-2xl font-black">{totalWeight}%</p>
                <p className="text-xs text-slate-400">Весов</p>
              </div>
            </div>
            {topSpecialty && (
              <div className="mt-5 rounded-lg bg-white p-4 text-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Лидер</p>
                <p className="mt-2 font-black">{topSpecialty.specialty.name}</p>
                <p className="text-sm text-slate-600">{topSpecialty.university.name} · {topSpecialty.score}/100</p>
              </div>
            )}
          </aside>
        </section>

        {error && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">{error}</div>}

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Настройки весов</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Что важнее именно вам</h2>
              </div>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Σ {totalWeight}%</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(weightPresets).map(([name, preset]) => (
                <button key={name} type="button" onClick={() => setWeights(preset)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
                  {name}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {criteriaKeys.map((key) => (
                <label key={key} className="block rounded-lg bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <span>
                      <span className="block text-sm font-bold text-slate-800">{criteriaLabels[key]}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{criteriaDescriptions[key]}</span>
                    </span>
                    <span className="rounded-lg bg-white px-3 py-1 text-sm font-black text-slate-950 shadow-sm">{weights[key]}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={weights[key]} onChange={(event) => setWeights((current) => distributeWeights(current, key, Number(event.target.value)))} className="mt-4 h-2 w-full accent-blue-600" />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Как считается рейтинг</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Weighted Sum Model с объяснениями</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-950 p-5 text-sm leading-7 text-slate-200">
                <p className="font-bold text-white">Итоговая формула</p>
                <p>S = Σ вес критерия × нормализованная оценка</p>
                <p>Все критерии приводятся к шкале 0-100.</p>
                <p>Сумма весов автоматически остается равной 100%.</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-5 text-sm leading-7 text-blue-950">
                <p className="font-bold">Важное допущение</p>
                <p>БВИ дает 100 по поступлению. Льгота “100 баллов за предмет” приближенно добавляет {hundredPointBenefitApproximation} баллов к сумме, потому что без предметной разбивки точный расчет невозможен.</p>
              </div>
            </div>
            {isLocalMode && <p className="mt-5 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">Сейчас включен локальный режим: данные сохраняются в браузере. Для общей базы подключите PostgreSQL через DATABASE_URL.</p>}
          </div>
        </section>

        {isFormOpen && (
          <section className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <form onSubmit={submitForm} className="mx-auto max-w-4xl rounded-lg bg-white p-5 shadow-2xl md:p-7">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Новый вариант</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Университет и направления</h2>
                </div>
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Закрыть
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="text-sm font-medium text-slate-700">Название университета</span>
                  <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} placeholder="Например, МГТУ им. Баумана" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label>
                  <span className="text-sm font-medium text-slate-700">Город</span>
                  <input value={draft.city} onChange={(event) => updateDraft({ city: event.target.value })} placeholder="Москва" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <NumberField label="Дорога до кампуса, минут" value={draft.commuteMinutes} min={0} max={360} onChange={(value) => updateDraft({ commuteMinutes: value })} />
                <NumberField label="Баллы за индивидуальные достижения" value={draft.extraPoints} min={0} max={25} onChange={(value) => updateDraft({ extraPoints: value })} />
                <label>
                  <span className="text-sm font-medium text-slate-700">Олимпиадная льгота</span>
                  <select value={draft.olympiadBenefit} onChange={(event) => updateDraft({ olympiadBenefit: event.target.value as OlympiadBenefit })} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    <option value="none">Нет льготы</option>
                    <option value="hundred">100 баллов за предмет</option>
                    <option value="bvi">БВИ</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <input type="checkbox" checked={draft.hasDormitory} onChange={(event) => updateDraft({ hasDormitory: event.target.checked })} className="size-4 accent-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">Есть общежитие</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <input type="checkbox" checked={draft.hasMilitaryDepartment} onChange={(event) => updateDraft({ hasMilitaryDepartment: event.target.checked })} className="size-4 accent-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">Есть ВУЦ</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {draft.specialties.map((specialty, index) => (
                  <SpecialtyFields key={index} specialty={specialty} index={index} canRemove={draft.specialties.length > 1} onChange={(patch) => updateSpecialty(index, patch)} onRemove={() => removeSpecialty(index)} />
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={addSpecialty} disabled={draft.specialties.length >= 8} className="rounded-lg border border-blue-200 px-4 py-3 font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Добавить направление
                </button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-slate-950 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                  {isSaving ? "Сохраняю..." : "Сохранить и пересчитать"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section id="ratings" className="mt-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Рейтинг направлений</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Лучшие варианты сверху</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">Карточки пересчитываются при изменении балла ЕГЭ, весов или данных университета. Итог не заменяет приемную комиссию, но помогает увидеть компромиссы без хаоса в таблицах.</p>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center font-semibold text-slate-500">Загружаю данные...</div>
          ) : ratedSpecialties.length === 0 ? (
            <div className="rounded-lg border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
              <h3 className="text-2xl font-black text-slate-950">Пока нет направлений для сравнения</h3>
              <p className="mx-auto mt-2 max-w-lg text-slate-500">Добавьте первый университет и хотя бы одну специальность. После сохранения здесь появится рейтинг всех вариантов.</p>
              <button type="button" onClick={() => setIsFormOpen(true)} className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700">
                Добавить первый ВУЗ
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              {ratedSpecialties.map((item) => (
                <SpecialtyCard key={item.id} item={item} onDeleteUniversity={(id) => void deleteUniversity(id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
