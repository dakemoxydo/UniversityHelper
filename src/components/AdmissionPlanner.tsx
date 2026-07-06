"use client";

import {
  calculateRatedSpecialties,
  defaultWeights,
  hundredPointBenefitApproximation,
  type OlympiadBenefit,
  type SpecialtyInput,
  type University,
  type UniversityInput,
  type Weights,
} from "@/lib/university-calculator";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  cleanExamSubjects,
  criteriaKeys,
  defaultExamSubjects,
  defaultSurveyAnswers,
  localStorageKey,
  nextSubject,
  normalizeWeights,
  profileStorageKey,
  weightsFromSurvey,
  weightsStorageKey,
  type ExamSubjectScore,
  type SurveyKey,
} from "./admission-planner/config";
import { ExamProfileEditor, NumberField, SpecialtyFields } from "./admission-planner/Fields";
import { SettingsModal, SurveyModal } from "./admission-planner/Modals";
import { SpecialtyCard } from "./admission-planner/SpecialtyCard";

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
        passingScore: Math.max(0, Math.min(500, Math.round(Number(specialty.passingScore) || 0))),
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

function readExamProfile() {
  if (typeof window === "undefined") {
    return defaultExamSubjects();
  }

  try {
    const raw = window.localStorage.getItem(profileStorageKey);
    const parsed = raw ? (JSON.parse(raw) as ExamSubjectScore[]) : null;
    return parsed && parsed.length >= 3 ? cleanExamSubjects(parsed) : defaultExamSubjects();
  } catch {
    return defaultExamSubjects();
  }
}

function readSavedWeights() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(weightsStorageKey);
    return raw ? (JSON.parse(raw) as Weights) : null;
  } catch {
    return null;
  }
}

export default function AdmissionPlanner() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [examSubjects, setExamSubjects] = useState<ExamSubjectScore[]>(defaultExamSubjects);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<SurveyKey, number>>(defaultSurveyAnswers);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [canCloseSurvey, setCanCloseSurvey] = useState(true);
  const [draft, setDraft] = useState<UniversityInput>(createEmptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const cleanSubjects = useMemo(() => cleanExamSubjects(examSubjects), [examSubjects]);
  const userExamScore = useMemo(() => cleanSubjects.reduce((sum, subject) => sum + subject.score, 0), [cleanSubjects]);
  const ratedSpecialties = useMemo(() => calculateRatedSpecialties(universities, userExamScore, weights), [universities, userExamScore, weights]);
  const topSpecialty = ratedSpecialties[0];
  const totalWeight = criteriaKeys.reduce((sum, key) => sum + weights[key], 0);

  useEffect(() => {
    const preferencesTimer = window.setTimeout(() => {
      setExamSubjects(readExamProfile());

      const savedWeights = readSavedWeights();
      if (savedWeights) {
        setWeights(normalizeWeights(savedWeights));
        setCanCloseSurvey(true);
      } else {
        setSurveyAnswers(defaultSurveyAnswers);
        setCanCloseSurvey(false);
        setIsSurveyOpen(true);
      }
    }, 0);

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

    return () => window.clearTimeout(preferencesTimer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      window.localStorage.setItem(profileStorageKey, JSON.stringify(cleanSubjects));
    }
  }, [cleanSubjects, isLoading]);

  useEffect(() => {
    if (isLocalMode && !isLoading) {
      window.localStorage.setItem(localStorageKey, JSON.stringify(universities));
    }
  }, [isLocalMode, isLoading, universities]);

  function updateWeights(nextWeights: Weights) {
    const normalized = normalizeWeights(nextWeights);
    setWeights(normalized);
    window.localStorage.setItem(weightsStorageKey, JSON.stringify(normalized));
  }

  function applySurveyWeights() {
    updateWeights(weightsFromSurvey(surveyAnswers));
    setCanCloseSurvey(true);
    setIsSurveyOpen(false);
  }

  function updateExamSubject(id: string, patch: Partial<ExamSubjectScore>) {
    setExamSubjects((current) => current.map((subject) => (subject.id === id ? { ...subject, ...patch } : subject)));
  }

  function addExamSubject() {
    setExamSubjects((current) => {
      if (current.length >= 5) {
        return current;
      }

      return [
        ...current,
        {
          id: `exam-${Date.now()}`,
          subject: nextSubject(current),
          score: 0,
        },
      ];
    });
  }

  function removeExamSubject(id: string) {
    setExamSubjects((current) => (current.length <= 3 ? current : current.filter((subject) => subject.id !== id)));
  }

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
    if (cleanSubjects.length < 3) {
      return "Добавьте минимум три предмета ЕГЭ в профиль абитуриента.";
    }

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
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Многокритериальный калькулятор</p>
                <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Выбор университета в цифрах, а не в догадках</h1>
              </div>
              <button type="button" onClick={() => setIsSettingsOpen(true)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
                Настройки рейтинга
              </button>
            </div>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Укажите предметы ЕГЭ и баллы по каждому, добавьте университеты и направления, а приоритеты настройте коротким опросом. Калькулятор соберет топ вариантов и покажет, почему они подходят или где есть риск.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setIsFormOpen(true)} className="rounded-lg bg-slate-950 px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-700">
                Добавить университет
              </button>
              <button type="button" onClick={() => setIsSurveyOpen(true)} className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-3 text-center text-base font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
                Пройти опрос приоритетов
              </button>
              <a href="#ratings" className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-center text-base font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
                Смотреть рейтинг
              </a>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-300">Профиль абитуриента</p>
            <ExamProfileEditor subjects={cleanSubjects} totalScore={userExamScore} onChange={updateExamSubject} onAdd={addExamSubject} onRemove={removeExamSubject} />
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
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
                <p className="text-sm text-slate-600">
                  {topSpecialty.university.name} · {topSpecialty.score}/100
                </p>
              </div>
            )}
          </aside>
        </section>

        {error && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">{error}</div>}

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Текущие приоритеты</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Вес рейтинга уже настроен</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">По умолчанию веса выставляются через опрос. Точную ручную настройку можно открыть кнопкой настроек.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {criteriaKeys.map((key) => (
                <div key={key} className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-800">{key === "admission" ? "Шанс поступления" : key === "fit" ? "Интерес и карьера" : key === "logistics" ? "Логистика" : key === "finance" ? "Финансы" : "Поддержка"}</span>
                    <span className="font-black text-slate-950">{weights[key]}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${weights[key]}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setIsSettingsOpen(true)} className="mt-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
              Изменить веса
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Как считается рейтинг</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Weighted Sum Model с объяснениями</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-950 p-5 text-sm leading-7 text-slate-200">
                <p className="font-bold text-white">Итоговая формула</p>
                <p>S = Σ вес критерия × нормализованная оценка</p>
                <p>Баллы профиля считаются как сумма выбранных предметов ЕГЭ.</p>
                <p>Сумма весов автоматически остается равной 100%.</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-5 text-sm leading-7 text-blue-950">
                <p className="font-bold">Важное допущение</p>
                <p>Выбирайте предметы, которые подходят для сравниваемых направлений. Льгота 100 баллов за предмет приближенно добавляет {hundredPointBenefitApproximation} баллов, потому что у направления пока нет списка обязательных предметов.</p>
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

        {isSettingsOpen && (
          <SettingsModal
            weights={weights}
            totalWeight={totalWeight}
            onClose={() => setIsSettingsOpen(false)}
            onWeightsChange={updateWeights}
            onOpenSurvey={() => {
              setCanCloseSurvey(true);
              setIsSurveyOpen(true);
            }}
          />
        )}

        {isSurveyOpen && (
          <SurveyModal
            answers={surveyAnswers}
            canClose={canCloseSurvey}
            onAnswer={(key, optionIndex) => setSurveyAnswers((current) => ({ ...current, [key]: optionIndex }))}
            onApply={applySurveyWeights}
            onClose={() => setIsSurveyOpen(false)}
          />
        )}

        <section id="ratings" className="mt-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Рейтинг направлений</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Лучшие варианты сверху</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">Карточки пересчитываются при изменении предметов ЕГЭ, весов или данных университета. Итог не заменяет приемную комиссию, но помогает увидеть компромиссы без хаоса в таблицах.</p>
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