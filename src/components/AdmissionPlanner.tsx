"use client";

import {
  calculateRatedSpecialties,
  criteriaDescriptions,
  criteriaLabels,
  defaultPriorityOrder,
  normalizeDisabledCriteria,
  normalizePriorityOrder,
  optionalCriteriaKeys,
  type CriteriaKey,
  type DisabledCriteria,
  type PriorityOrder,
  type SpecialtyInput,
  type University,
  type UniversityInput,
} from "@/lib/university-calculator";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  cleanExamSubjects,
  defaultExamSubjects,
  disabledCriteriaStorageKey,
  localStorageKey,
  movePriority,
  nextSubject,
  priorityOrderStorageKey,
  profileStorageKey,
  type ExamSubjectScore,
} from "./admission-planner/config";
import { ExamProfileEditor, NumberField, SpecialtyFields } from "./admission-planner/Fields";
import { PriorityModal } from "./admission-planner/Modals";
import { SpecialtyCard } from "./admission-planner/SpecialtyCard";

type AuthUser = {
  id: number;
  login: string;
};

type ProfilePayload = {
  examSubjects?: ExamSubjectScore[];
  priorityOrder?: CriteriaKey[];
  disabledCriteria?: CriteriaKey[];
};

const emptySpecialty = (): SpecialtyInput => ({
  name: "",
  direction: "",
  admissionBasis: "both",
  tuitionCost: 0,
  budgetSeats: 0,
  budgetPassingScore: 0,
  budgetAverageScore: 0,
  budgetMaxScore: 0,
  paidSeats: 0,
  paidPassingScore: 0,
  paidAverageScore: 0,
  paidMaxScore: 0,
});

const createEmptyDraft = (): UniversityInput => ({
  name: "",
  city: "",
  hasMilitaryDepartment: false,
  hasDormitory: false,
  commuteMinutes: 45,
  specialties: [emptySpecialty()],
});

function cleanAdmissionScore(value: number) {
  return Math.max(0, Math.min(500, Math.round(Number(value) || 0)));
}

function cleanDraft(draft: UniversityInput): UniversityInput {
  return {
    ...draft,
    name: draft.name.trim(),
    city: draft.city.trim(),
    commuteMinutes: Math.max(0, Math.min(360, Math.round(Number(draft.commuteMinutes) || 0))),
    specialties: draft.specialties
      .map((specialty) => {
        const admissionBasis = specialty.admissionBasis ?? "both";
        const hasBudget = admissionBasis === "budget" || admissionBasis === "both";
        const hasPaid = admissionBasis === "paid" || admissionBasis === "both";

        return {
          id: specialty.id,
          admissionBasis,
          name: specialty.name.trim(),
          direction: specialty.direction.trim(),
          tuitionCost: hasPaid ? Math.max(0, Math.min(5_000_000, Math.round(Number(specialty.tuitionCost) || 0))) : 0,
          budgetSeats: hasBudget ? Math.max(0, Math.min(10_000, Math.round(Number(specialty.budgetSeats) || 0))) : 0,
          budgetPassingScore: hasBudget ? cleanAdmissionScore(specialty.budgetPassingScore) : 0,
          budgetAverageScore: hasBudget ? cleanAdmissionScore(specialty.budgetAverageScore) : 0,
          budgetMaxScore: hasBudget ? cleanAdmissionScore(specialty.budgetMaxScore) : 0,
          paidSeats: hasPaid ? Math.max(0, Math.min(10_000, Math.round(Number(specialty.paidSeats) || 0))) : 0,
          paidPassingScore: hasPaid ? cleanAdmissionScore(specialty.paidPassingScore) : 0,
          paidAverageScore: hasPaid ? cleanAdmissionScore(specialty.paidAverageScore) : 0,
          paidMaxScore: hasPaid ? cleanAdmissionScore(specialty.paidMaxScore) : 0,
        };
      })
      .filter((specialty) => specialty.name.length > 0),
  };
}

function draftFromUniversity(university: University): UniversityInput {
  return {
    name: university.name,
    city: university.city,
    hasMilitaryDepartment: university.hasMilitaryDepartment,
    hasDormitory: university.hasDormitory,
    commuteMinutes: university.commuteMinutes,
    specialties: university.specialties.map((specialty) => ({
      id: specialty.id,
      name: specialty.name,
      direction: specialty.direction ?? "",
      admissionBasis: specialty.admissionBasis ?? "both",
      tuitionCost: specialty.tuitionCost ?? 0,
      budgetSeats: specialty.budgetSeats ?? 0,
      budgetPassingScore: specialty.budgetPassingScore ?? 0,
      budgetAverageScore: specialty.budgetAverageScore ?? 0,
      budgetMaxScore: specialty.budgetMaxScore ?? 0,
      paidSeats: specialty.paidSeats ?? 0,
      paidPassingScore: specialty.paidPassingScore ?? 0,
      paidAverageScore: specialty.paidAverageScore ?? 0,
      paidMaxScore: specialty.paidMaxScore ?? 0,
    })),
  };
}

function readLocalUniversities() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    return raw ? (JSON.parse(raw) as University[]) : [];
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

function readPriorityOrder() {
  if (typeof window === "undefined") {
    return defaultPriorityOrder;
  }

  try {
    const raw = window.localStorage.getItem(priorityOrderStorageKey);
    const parsed = raw ? (JSON.parse(raw) as CriteriaKey[]) : defaultPriorityOrder;
    return normalizePriorityOrder(parsed);
  } catch {
    return defaultPriorityOrder;
  }
}

function readDisabledCriteria() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(disabledCriteriaStorageKey);
    const parsed = raw ? (JSON.parse(raw) as CriteriaKey[]) : [];
    return normalizeDisabledCriteria(parsed);
  } catch {
    return [];
  }
}

function localUniversityFromDraft(input: UniversityInput, previous?: University): University {
  const universityId = previous?.id ?? Date.now();

  return {
    ...input,
    id: universityId,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
    specialties: input.specialties.map((specialty, index) => ({
      ...specialty,
      id: specialty.id ?? previous?.specialties[index]?.id ?? universityId + index + 1,
      universityId,
    })),
  };
}

export default function AdmissionPlanner() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [examSubjects, setExamSubjects] = useState<ExamSubjectScore[]>(defaultExamSubjects);
  const [priorityOrder, setPriorityOrder] = useState<PriorityOrder>(defaultPriorityOrder);
  const [disabledCriteria, setDisabledCriteria] = useState<DisabledCriteria>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [editingUniversityId, setEditingUniversityId] = useState<number | null>(null);
  const [draft, setDraft] = useState<UniversityInput>(createEmptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLogin, setAuthLogin] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const cleanSubjects = useMemo(() => cleanExamSubjects(examSubjects), [examSubjects]);
  const userExamScore = useMemo(() => cleanSubjects.reduce((sum, subject) => sum + subject.score, 0), [cleanSubjects]);
  const ratedSpecialties = useMemo(() => calculateRatedSpecialties(universities, priorityOrder, disabledCriteria), [universities, priorityOrder, disabledCriteria]);
  const topSpecialty = ratedSpecialties[0];
  const ratedCount = ratedSpecialties.length;
  const universityCount = universities.length;
  const isEditing = editingUniversityId !== null;

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await response.json()) as { user?: AuthUser | null; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось проверить сессию.");
        }

        setCurrentUser(data.user ?? null);
      } catch (sessionError) {
        setAuthError(sessionError instanceof Error ? sessionError.message : "Не удалось проверить вход.");
        setCurrentUser(null);
        setIsLoading(false);
      } finally {
        setIsAuthLoading(false);
      }
    }

    void loadSession();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let cancelled = false;

    async function loadUserData() {
      setIsLoading(true);
      setError(null);

      try {
        const profileResponse = await fetch("/api/profile", { cache: "no-store" });
        const profileData = (await profileResponse.json()) as { profile?: ProfilePayload; error?: string };

        if (!profileResponse.ok) {
          throw new Error(profileData.error ?? "Не удалось загрузить профиль.");
        }

        if (!cancelled && profileData.profile) {
          setExamSubjects(profileData.profile.examSubjects && profileData.profile.examSubjects.length >= 3 ? cleanExamSubjects(profileData.profile.examSubjects) : readExamProfile());
          setPriorityOrder(profileData.profile.priorityOrder ? normalizePriorityOrder(profileData.profile.priorityOrder) : readPriorityOrder());
          setDisabledCriteria(profileData.profile.disabledCriteria ? normalizeDisabledCriteria(profileData.profile.disabledCriteria) : readDisabledCriteria());
        }
      } catch {
        if (!cancelled) {
          setExamSubjects(readExamProfile());
          setPriorityOrder(readPriorityOrder());
          setDisabledCriteria(readDisabledCriteria());
        }
      }

      try {
        const response = await fetch("/api/universities", { cache: "no-store" });
        const data = (await response.json()) as { universities?: University[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось загрузить университеты.");
        }

        if (!cancelled) {
          setUniversities(data.universities ?? []);
          setIsLocalMode(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setUniversities(readLocalUniversities());
          setIsLocalMode(true);
          setError(loadError instanceof Error ? `${loadError.message} Данные будут сохранены локально в браузере.` : "Работаем в локальном режиме.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!isLoading) {
      window.localStorage.setItem(profileStorageKey, JSON.stringify(cleanSubjects));
    }
  }, [cleanSubjects, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      window.localStorage.setItem(priorityOrderStorageKey, JSON.stringify(priorityOrder));
    }
  }, [isLoading, priorityOrder]);

  useEffect(() => {
    if (!isLoading) {
      window.localStorage.setItem(disabledCriteriaStorageKey, JSON.stringify(disabledCriteria));
    }
  }, [disabledCriteria, isLoading]);

  useEffect(() => {
    if (isLocalMode && !isLoading) {
      window.localStorage.setItem(localStorageKey, JSON.stringify(universities));
    }
  }, [isLocalMode, isLoading, universities]);
  useEffect(() => {
    if (!currentUser || isLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSubjects: cleanSubjects, priorityOrder, disabledCriteria }),
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [cleanSubjects, currentUser, disabledCriteria, isLoading, priorityOrder]);


  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    try {
      const response = await fetch(authMode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: authLogin, password: authPassword }),
      });
      const data = (await response.json()) as { user?: AuthUser; error?: string };

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Не удалось войти.");
      }

      setAuthLogin("");
      setAuthPassword("");
      setCurrentUser(data.user);
      setIsLoading(true);
    } catch (authSubmitError) {
      setAuthError(authSubmitError instanceof Error ? authSubmitError.message : "Не удалось войти.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setCurrentUser(null);
    setUniversities([]);
    setIsLocalMode(false);
    setIsLoading(false);
    resetForm();
  }
  function updatePriorityOrder(nextOrder: PriorityOrder) {
    setPriorityOrder(normalizePriorityOrder(nextOrder));
  }

  function updateDisabledCriteria(nextCriteria: DisabledCriteria) {
    setDisabledCriteria(normalizeDisabledCriteria(nextCriteria));
  }

  function shiftPriority(key: CriteriaKey, direction: "up" | "down") {
    updatePriorityOrder(movePriority(priorityOrder, key, direction));
  }

  function toggleDisabledCriterion(key: CriteriaKey) {
    if (!optionalCriteriaKeys.includes(key)) {
      return;
    }

    updateDisabledCriteria(disabledCriteria.includes(key) ? disabledCriteria.filter((item) => item !== key) : [...disabledCriteria, key]);
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

  function updateSpecialty(index: number, patch: Partial<SpecialtyInput>) {
    setDraft((current) => ({
      ...current,
      specialties: current.specialties.map((specialty, specialtyIndex) => (specialtyIndex === index ? { ...specialty, ...patch } : specialty)),
    }));
  }

  function addSpecialty() {
    setDraft((current) => ({
      ...current,
      specialties: current.specialties.length >= 8 ? current.specialties : [...current.specialties, emptySpecialty()],
    }));
  }

  function removeSpecialty(index: number) {
    setDraft((current) => ({
      ...current,
      specialties: current.specialties.length <= 1 ? current.specialties : current.specialties.filter((_, specialtyIndex) => specialtyIndex !== index),
    }));
  }

  function startEditUniversity(id: number) {
    const university = universities.find((item) => item.id === id);

    if (!university) {
      return;
    }

    setEditingUniversityId(id);
    setDraft(draftFromUniversity(university));
    setIsFormOpen(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingUniversityId(null);
    setDraft(createEmptyDraft());
    setIsFormOpen(false);
  }

  async function saveUniversity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleaned = cleanDraft(draft);

    if (!cleaned.name || cleaned.specialties.length === 0) {
      setError("Добавьте название вуза и хотя бы один профиль обучения.");
      return;
    }

    setIsSaving(true);

    const previousUniversity = editingUniversityId === null ? undefined : universities.find((university) => university.id === editingUniversityId);

    try {
      const response = await fetch(editingUniversityId === null ? "/api/universities" : `/api/universities?id=${editingUniversityId}`, {
        method: editingUniversityId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      const data = (await response.json()) as { university?: University; error?: string };

      if (!response.ok || !data.university) {
        throw new Error(data.error ?? "Не удалось сохранить университет.");
      }

      setUniversities((current) => (editingUniversityId === null ? [data.university!, ...current] : current.map((university) => (university.id === editingUniversityId ? data.university! : university))));
      setIsLocalMode(false);
    } catch (saveError) {
      const localUniversity = localUniversityFromDraft(cleaned, previousUniversity);
      setUniversities((current) => (editingUniversityId === null ? [localUniversity, ...current] : current.map((university) => (university.id === editingUniversityId ? localUniversity : university))));
      setIsLocalMode(true);
      setError(saveError instanceof Error ? `${saveError.message} Изменения сохранены локально.` : "Изменения сохранены локально.");
    } finally {
      resetForm();
      setIsSaving(false);
    }
  }

  async function deleteUniversity(id: number) {
    const university = universities.find((item) => item.id === id);

    if (!window.confirm(`Удалить ${university?.name ?? "этот вуз"} и все его профили?`)) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/universities?id=${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось удалить университет.");
      }
    } catch (deleteError) {
      setIsLocalMode(true);
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить университет.");
    } finally {
      setUniversities((current) => current.filter((university) => university.id !== id));
      if (editingUniversityId === id) {
        resetForm();
      }
    }
  }
  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">University Helper</p>
          <p className="mt-3 text-lg font-black">Проверяем вход...</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
        <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">University Helper</p>
          <h1 className="mt-3 text-3xl font-black">{authMode === "login" ? "Вход в профиль" : "Новый профиль"}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Вузы, профили обучения, предметы ЕГЭ и приоритеты будут сохраняться отдельно для вашего аккаунта.</p>

          {authError && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{authError}</div>}

          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-200">Логин</span>
              <input value={authLogin} onChange={(event) => setAuthLogin(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-400/20" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-200">Пароль</span>
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete={authMode === "login" ? "current-password" : "new-password"} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-400/20" />
            </label>
            <button type="submit" className="w-full rounded-lg bg-white px-5 py-3 text-base font-bold text-slate-950 transition hover:bg-blue-50">
              {authMode === "login" ? "Войти" : "Создать профиль"}
            </button>
          </form>

          <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(null); }} className="mt-4 w-full rounded-lg border border-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            {authMode === "login" ? "Создать новый профиль" : "Уже есть профиль"}
          </button>
        </section>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-4 py-8 text-white md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">University Helper</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">Сравнение профилей обучения по данным приема</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Выберите вуз, заполните профиль обучения и направление подготовки. Для каждого профиля можно внести бюджетные и платные данные отдельно: места, проходной, средний и максимальный балл.
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-300">Профиль: {currentUser.login}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))} className="rounded-lg bg-white px-5 py-3 text-center text-base font-bold text-slate-950 transition hover:bg-blue-50">
                {isFormOpen ? "Скрыть форму" : "Добавить вуз"}
              </button>
              <button type="button" onClick={() => setIsPriorityOpen(true)} className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-3 text-center text-base font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
                Настроить приоритеты
              </button>
              <button type="button" onClick={logout} className="rounded-lg border border-white/20 px-5 py-3 text-center text-base font-bold text-white transition hover:bg-white/10">
                Выйти
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-200">Ваш профиль</p>
                <h2 className="mt-2 text-2xl font-black">Баллы ЕГЭ</h2>
              </div>
              <div className="rounded-lg bg-white p-3 text-slate-950">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Итого</p>
                <p className="text-3xl font-black">{userExamScore}</p>
              </div>
            </div>
            <ExamProfileEditor subjects={examSubjects} totalScore={userExamScore} onChange={updateExamSubject} onAdd={addExamSubject} onRemove={removeExamSubject} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {error && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{error}</div>}
        {isLocalMode && !error && <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">Локальный режим: данные сохраняются в этом браузере.</div>}

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Текущие приоритеты</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Что важнее при сравнении</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Перемещайте параметры. Дорогу и общежитие можно полностью отключить.</p>
              </div>
              <button type="button" onClick={() => setIsPriorityOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                Открыть
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {priorityOrder.map((key, index) => {
                const disabled = disabledCriteria.includes(key);
                const optional = optionalCriteriaKeys.includes(key);

                return (
                  <div key={key} className={`grid grid-cols-[2rem_1fr_auto] gap-3 rounded-lg p-3 ${disabled ? "bg-slate-100 opacity-75" : "bg-slate-50"}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-sm">{index + 1}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-950">{criteriaLabels[key]}</p>
                        {disabled && <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">выкл.</span>}
                      </div>
                      <p className="text-xs leading-5 text-slate-500">{criteriaDescriptions[key]}</p>
                      {optional && (
                        <button type="button" onClick={() => toggleDisabledCriterion(key)} className="mt-2 text-xs font-bold text-blue-700 hover:text-blue-900">
                          {disabled ? "Учитывать" : "Не учитывать"}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={index === 0} onClick={() => shiftPriority(key, "up")} className="h-8 w-8 rounded-lg border border-slate-200 bg-white font-black text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Поднять ${criteriaLabels[key]}`}>
                        ↑
                      </button>
                      <button type="button" disabled={index === priorityOrder.length - 1} onClick={() => shiftPriority(key, "down")} className="h-8 w-8 rounded-lg border border-slate-200 bg-white font-black text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Опустить ${criteriaLabels[key]}`}>
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Как считается</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Без оценки шансов</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-950 p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Вузов</p>
                <p className="mt-1 text-3xl font-black">{universityCount}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-blue-950">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Профилей</p>
                <p className="mt-1 text-3xl font-black">{ratedCount}</p>
              </div>
              <div className="rounded-lg bg-white p-4 text-slate-700 ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">ЕГЭ</p>
                <p className="mt-1 text-3xl font-black text-slate-950">{userExamScore}</p>
                <p className="text-xs text-slate-500">не влияет на рейтинг</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-950 p-5 text-sm leading-7 text-slate-200">
                <p className="font-bold text-white">Сравниваются только факты</p>
                <p>Количество мест, баллы поступивших, стоимость, дорога, общежитие и ВУЦ нормализуются относительно текущего списка вариантов.</p>
                <p>Отключенные параметры получают вес 0 и не меняют итоговый рейтинг.</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-5 text-sm leading-7 text-blue-950">
                <p className="font-bold">ЕГЭ не участвует в итоговой оценке</p>
                <p>Ваши баллы сохраняются в профиле и показываются в карточках рядом с официальными баллами поступивших.</p>
              </div>
            </div>
          </div>
        </section>

        {topSpecialty && (
          <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Лучшее совпадение сейчас</p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{topSpecialty.specialty.name}</h2>
                <p className="mt-1 text-sm text-emerald-900">
                  {topSpecialty.university.name} {topSpecialty.specialty.direction ? `· ${topSpecialty.specialty.direction}` : ""} · итог {topSpecialty.score} из 100
                </p>
              </div>
              <a href="#ratings" className="rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-emerald-800">
                Смотреть рейтинг
              </a>
            </div>
          </section>
        )}

        {isFormOpen && (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Данные для сравнения</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{isEditing ? "Редактировать университет" : "Добавить университет"}</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-500">У вуза заполняются общие условия, а профили обучения и направления подготовки вводятся внутри него.</p>
            </div>

            <form onSubmit={saveUniversity} className="mt-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <label>
                  <span className="text-sm font-medium text-slate-700">Название вуза</span>
                  <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Например, МГТУ им. Баумана" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label>
                  <span className="text-sm font-medium text-slate-700">Город</span>
                  <input value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Москва" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <NumberField label="Время до университета, минут" value={draft.commuteMinutes} min={0} max={360} onChange={(value) => setDraft((current) => ({ ...current, commuteMinutes: value }))} />
                <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={draft.hasDormitory} onChange={(event) => setDraft((current) => ({ ...current, hasDormitory: event.target.checked }))} className="h-5 w-5 accent-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">Есть общежитие</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={draft.hasMilitaryDepartment} onChange={(event) => setDraft((current) => ({ ...current, hasMilitaryDepartment: event.target.checked }))} className="h-5 w-5 accent-blue-600" />
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
                  Добавить профиль обучения
                </button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {isEditing && (
                    <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50">
                      Отмена
                    </button>
                  )}
                  <button type="submit" disabled={isSaving} className="rounded-lg bg-slate-950 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                    {isSaving ? "Сохраняю..." : isEditing ? "Сохранить изменения" : "Сохранить и пересчитать"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {isPriorityOpen && <PriorityModal priorityOrder={priorityOrder} disabledCriteria={disabledCriteria} onClose={() => setIsPriorityOpen(false)} onPriorityChange={updatePriorityOrder} onDisabledCriteriaChange={updateDisabledCriteria} />}

        <section id="ratings" className="mt-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Рейтинг профилей</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Варианты в порядке относительного совпадения</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">Карточки пересчитываются при добавлении, редактировании, удалении вузов и перестановке приоритетов.</p>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">Загружаю варианты...</div>
          ) : ratedSpecialties.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-lg font-black text-slate-950">Пока нечего сравнивать</p>
              <p className="mt-2 text-sm text-slate-500">Добавьте хотя бы один вуз и профиль обучения, чтобы увидеть относительный рейтинг.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {ratedSpecialties.map((item) => (
                <SpecialtyCard key={item.id} item={item} userExamScore={userExamScore} onEditUniversity={startEditUniversity} onDeleteUniversity={deleteUniversity} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
