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

type DashboardSection = "about" | "universities" | "profile" | "settings";

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

const dashboardSections: Array<{ id: DashboardSection; label: string; description: string }> = [
  { id: "about", label: "О сайте", description: "Как работает сравнение" },
  { id: "universities", label: "Вузы", description: "Данные и рейтинг" },
  { id: "profile", label: "Профиль", description: "Баллы ЕГЭ" },
  { id: "settings", label: "Настройки", description: "Приоритеты и вход" },
];

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


async function readApiJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
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
  const [activeSection, setActiveSection] = useState<DashboardSection>("about");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [editingUniversityId, setEditingUniversityId] = useState<number | null>(null);
  const [draft, setDraft] = useState<UniversityInput>(createEmptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLogin, setAuthLogin] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

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
        const data = await readApiJson<{ user?: AuthUser | null; error?: string }>(response);

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось проверить сессию.");
        }

        setCurrentUser(data.user ?? null);
        setIsGuestMode(false);
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
    if (!currentUser || isGuestMode) {
      return;
    }

    let cancelled = false;

    async function loadUserData() {
      setIsLoading(true);
      setError(null);

      try {
        const profileResponse = await fetch("/api/profile", { cache: "no-store" });
        const profileData = await readApiJson<{ profile?: ProfilePayload; error?: string }>(profileResponse);

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
        const data = await readApiJson<{ universities?: University[]; error?: string }>(response);

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
  }, [currentUser, isGuestMode]);

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
    if (!currentUser || isGuestMode || isLoading) {
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
  }, [cleanSubjects, currentUser, disabledCriteria, isGuestMode, isLoading, priorityOrder]);


  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAuthSubmitting) {
      return;
    }

    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      const response = await fetch(authMode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: authLogin, password: authPassword }),
      });
      const data = await readApiJson<{ user?: AuthUser; error?: string }>(response);

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Не удалось войти.");
      }

      setAuthLogin("");
      setAuthPassword("");
      setIsGuestMode(false);
      setCurrentUser(data.user);
      setIsLoading(true);
    } catch (authSubmitError) {
      setAuthError(authSubmitError instanceof Error ? authSubmitError.message : "Не удалось войти.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  function startGuestSession() {
    setAuthError(null);
    setAuthLogin("");
    setAuthPassword("");
    setIsGuestMode(true);
    setCurrentUser({ id: 0, login: "Гость" });
    setExamSubjects(readExamProfile());
    setPriorityOrder(readPriorityOrder());
    setDisabledCriteria(readDisabledCriteria());
    setUniversities(readLocalUniversities());
    setIsLocalMode(true);
    setIsLoading(false);
  }

  async function logout() {
    if (!isGuestMode) {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    }

    setCurrentUser(null);
    setIsGuestMode(false);
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
    setActiveSection("universities");
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

    if (isGuestMode) {
      const localUniversity = localUniversityFromDraft(cleaned, previousUniversity);
      setUniversities((current) => (editingUniversityId === null ? [localUniversity, ...current] : current.map((university) => (university.id === editingUniversityId ? localUniversity : university))));
      setIsLocalMode(true);
      resetForm();
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(editingUniversityId === null ? "/api/universities" : `/api/universities?id=${editingUniversityId}`, {
        method: editingUniversityId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      const data = await readApiJson<{ university?: University; error?: string }>(response);

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

    if (isGuestMode) {
      setUniversities((current) => current.filter((university) => university.id !== id));
      if (editingUniversityId === id) {
        resetForm();
      }
      return;
    }

    try {
      const response = await fetch(`/api/universities?id=${id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);

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
            <button type="submit" disabled={isAuthSubmitting} className="w-full rounded-lg bg-white px-5 py-3 text-base font-bold text-slate-950 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">
              {isAuthSubmitting ? "Проверяю..." : authMode === "login" ? "Войти" : "Создать профиль"}
            </button>
          </form>

          <button type="button" onClick={startGuestSession} className="mt-4 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
            Войти как гость
          </button>

          <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(null); }} className="mt-3 w-full rounded-lg border border-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            {authMode === "login" ? "Создать новый профиль" : "Уже есть профиль"}
          </button>
        </section>
      </main>
    );
  }



  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[96rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-950 px-4 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-slate-800 lg:px-5">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">University Helper</p>
              <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight">Панель выбора вуза</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Разделил данные, рейтинг, профиль и настройки, чтобы экран работал как dashboard, а не как длинная анкета.
              </p>
            </div>
            <button type="button" onClick={logout} className="min-h-10 rounded-lg border border-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10 lg:mt-6 lg:w-full">
              Выйти
            </button>
          </div>

          <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1" aria-label="Разделы панели">
            {dashboardSections.map((section) => {
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={active ? "rounded-lg bg-white px-3 py-3 text-left text-slate-950 shadow-sm" : "rounded-lg px-3 py-3 text-left text-slate-300 transition hover:bg-white/10 hover:text-white"}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="block text-sm font-black">{section.label}</span>
                  <span className={active ? "mt-1 block text-xs font-semibold text-slate-500" : "mt-1 block text-xs text-slate-500"}>{section.description}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Профиль</p>
            <p className="mt-2 text-sm font-bold text-white">{currentUser.login}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{isGuestMode ? "Гостевой режим: данные хранятся только в этом браузере." : "Данные профиля синхронизируются с сервером."}</p>
          </div>
        </aside>

        <div className="min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {error && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{error}</div>}
          {isLocalMode && !error && <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">Локальный режим: данные сохраняются в этом браузере.</div>}

          <header className="mb-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">{dashboardSections.find((section) => section.id === activeSection)?.label}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {activeSection === "about" && "Обзор и логика сравнения"}
                {activeSection === "universities" && "Вузы, профили и рейтинг"}
                {activeSection === "profile" && "Профиль ЕГЭ"}
                {activeSection === "settings" && "Настройки сравнения"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {activeSection === "about" && "Короткая сводка по данным, лучшему совпадению и тому, как считается рейтинг."}
                {activeSection === "universities" && "Добавляйте университеты и профили обучения, а затем сравнивайте их в рейтинге."}
                {activeSection === "profile" && "Укажите предметы и баллы ЕГЭ. Они сохраняются для справки и показываются рядом с рейтингом."}
                {activeSection === "settings" && "Настройте вес критериев, отключите неважные параметры и проверьте режим хранения."}
              </p>
            </div>
            {activeSection === "universities" && (
              <button type="button" onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))} className="min-h-12 rounded-lg bg-slate-950 px-5 py-3 text-center text-base font-bold text-white shadow-sm transition hover:bg-blue-700">
                {isFormOpen ? "Скрыть форму" : "Добавить вуз"}
              </button>
            )}
            {activeSection === "settings" && (
              <button type="button" onClick={() => setIsPriorityOpen(true)} className="min-h-12 rounded-lg bg-slate-950 px-5 py-3 text-center text-base font-bold text-white shadow-sm transition hover:bg-blue-700">
                Открыть приоритеты
              </button>
            )}
          </header>

          {activeSection === "about" && (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-950 p-5 text-white shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Вузов</p>
                  <p className="mt-2 text-4xl font-black">{universityCount}</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-blue-950 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Профилей</p>
                  <p className="mt-2 text-4xl font-black">{ratedCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-sm shadow-slate-200/60">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Баллы ЕГЭ</p>
                  <p className="mt-2 text-4xl font-black">{userExamScore}</p>
                  <p className="mt-1 text-xs text-slate-500">не влияют на рейтинг</p>
                </div>
              </section>

              {topSpecialty ? (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm shadow-emerald-100/70 md:p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Лучшее совпадение сейчас</p>
                  <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-950">{topSpecialty.specialty.name}</h3>
                      <p className="mt-1 text-sm text-emerald-900">
                        {topSpecialty.university.name} {topSpecialty.specialty.direction ? `· ${topSpecialty.specialty.direction}` : ""} · итог {topSpecialty.score} из 100
                      </p>
                    </div>
                    <button type="button" onClick={() => setActiveSection("universities")} className="rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-emerald-800">
                      Смотреть рейтинг
                    </button>
                  </div>
                </section>
              ) : (
                <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                  <p className="text-lg font-black text-slate-950">Пока нечего сравнивать</p>
                  <p className="mt-2 text-sm text-slate-500">Добавьте вуз и профиль обучения, чтобы увидеть лучший вариант.</p>
                  <button type="button" onClick={() => { setActiveSection("universities"); setIsFormOpen(true); }} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
                    Добавить вуз
                  </button>
                </section>
              )}

              <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 md:p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Что важно</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">Текущие приоритеты</h3>
                  <div className="mt-5 space-y-2">
                    {priorityOrder.slice(0, 5).map((key, index) => {
                      const disabled = disabledCriteria.includes(key);

                      return (
                        <div key={key} className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg p-3 ${disabled ? "bg-slate-100 opacity-75" : "bg-slate-50"}`}>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-sm">{index + 1}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-950">{criteriaLabels[key]}</p>
                              {disabled && <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">выкл.</span>}
                            </div>
                            <p className="text-xs leading-5 text-slate-500">{criteriaDescriptions[key]}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 md:p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Как считается</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">Без оценки шансов</h3>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
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
            </div>
          )}

          {activeSection === "universities" && (
            <div className="space-y-6">
              {isFormOpen && (
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 md:p-6">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Данные для сравнения</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">{isEditing ? "Редактировать университет" : "Добавить университет"}</h3>
                    </div>
                    <p className="max-w-xl text-sm leading-6 text-slate-500">У вуза заполняются общие условия, а профили обучения и направления подготовки вводятся внутри него.</p>
                  </div>

                  <form onSubmit={saveUniversity} className="mt-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <label>
                        <span className="text-sm font-medium text-slate-700">Название вуза</span>
                        <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Например, МГТУ им. Баумана" className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      </label>
                      <label>
                        <span className="text-sm font-medium text-slate-700">Город</span>
                        <input value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Москва" className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
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
                      <button type="button" onClick={addSpecialty} disabled={draft.specialties.length >= 8} className="min-h-12 rounded-lg border border-blue-200 px-4 py-3 font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                        Добавить профиль обучения
                      </button>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {isEditing && (
                          <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50">
                            Отмена
                          </button>
                        )}
                        <button type="submit" disabled={isSaving} className="min-h-12 rounded-lg bg-slate-950 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                          {isSaving ? "Сохраняю..." : isEditing ? "Сохранить изменения" : "Сохранить и пересчитать"}
                        </button>
                      </div>
                    </div>
                  </form>
                </section>
              )}

              <section id="ratings">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Рейтинг профилей</p>
                    <h3 className="mt-2 text-3xl font-black text-slate-950">Варианты в порядке относительного совпадения</h3>
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
          )}

          {activeSection === "profile" && (
            <section className="grid gap-5 xl:grid-cols-[25rem_minmax(0,1fr)]">
              <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-200">Ваш профиль</p>
                    <h3 className="mt-2 text-2xl font-black">Баллы ЕГЭ</h3>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-slate-950">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Итого</p>
                    <p className="text-3xl font-black">{userExamScore}</p>
                  </div>
                </div>
                <ExamProfileEditor subjects={examSubjects} totalScore={userExamScore} onChange={updateExamSubject} onAdd={addExamSubject} onRemove={removeExamSubject} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 md:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Для чего это нужно</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Баллы отделены от рейтинга</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">ЕГЭ показывает ваш контекст рядом с проходными, средними и максимальными баллами поступивших. Итоговый рейтинг сравнивает только параметры вузов и профилей, чтобы не выдавать ложную оценку шансов.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {cleanSubjects.map((subject) => (
                    <div key={subject.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{subject.subject}</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{subject.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeSection === "settings" && (
            <div className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Приоритеты</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">Что важнее при сравнении</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Перемещайте параметры. Дорогу и общежитие можно полностью отключить.</p>
                  </div>
                  <button type="button" onClick={() => setIsPriorityOpen(true)} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                    Открыть
                  </button>
                </div>

                <div className="mt-5 space-y-2">
                  {priorityOrder.map((key, index) => {
                    const disabled = disabledCriteria.includes(key);
                    const optional = optionalCriteriaKeys.includes(key);

                    return (
                      <div key={key} className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg p-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] ${disabled ? "bg-slate-100 opacity-75" : "bg-slate-50"}`}>
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
                        <div className="col-span-2 flex gap-2 sm:col-span-1">
                          <button type="button" disabled={index === 0} onClick={() => shiftPriority(key, "up")} className="h-9 w-9 rounded-lg border border-slate-200 bg-white font-black text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Поднять ${criteriaLabels[key]}`}>
                            ↑
                          </button>
                          <button type="button" disabled={index === priorityOrder.length - 1} onClick={() => shiftPriority(key, "down")} className="h-9 w-9 rounded-lg border border-slate-200 bg-white font-black text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Опустить ${criteriaLabels[key]}`}>
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-5 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Аккаунт</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">{currentUser.login}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{isGuestMode ? "Гость работает без регистрации. Данные сохраняются локально и доступны только в этом браузере." : "Вы вошли в профиль. Данные сохраняются на сервере, а локальная копия используется как резерв."}</p>
                  <button type="button" onClick={logout} className="mt-5 min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                    Выйти
                  </button>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Хранение</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">{isLocalMode ? "Локальный режим" : "Серверный режим"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Локальный режим использует localStorage. Он полезен для гостя и как fallback, если база временно недоступна.</p>
                </div>
              </section>
            </div>
          )}

          {isPriorityOpen && <PriorityModal priorityOrder={priorityOrder} disabledCriteria={disabledCriteria} onClose={() => setIsPriorityOpen(false)} onPriorityChange={updatePriorityOrder} onDisabledCriteriaChange={updateDisabledCriteria} />}
        </div>
      </div>
    </main>
  );
}
