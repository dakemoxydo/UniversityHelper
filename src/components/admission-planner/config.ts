import {
  criteriaDescriptions,
  criteriaLabels,
  defaultPriorityOrder,
  normalizePriorityOrder,
  type CriteriaKey,
  type PriorityOrder,
} from "@/lib/university-calculator";

export const criteriaKeys: CriteriaKey[] = [...defaultPriorityOrder];
export const localStorageKey = "university-helper-draft-v3";
export const profileStorageKey = "university-helper-profile-v1";
export const priorityOrderStorageKey = "university-helper-priority-order-v1";
export const disabledCriteriaStorageKey = "university-helper-disabled-criteria-v1";
export const maxExamSubjects = 5;

export const examSubjectOptions = [
  "Русский язык",
  "Профильная математика",
  "Базовая математика",
  "Информатика",
  "Физика",
  "Обществознание",
  "История",
  "Иностранный язык",
  "Биология",
  "Химия",
  "География",
  "Литература",
];

export const directionOptions = [
  "01.03.01 Математика",
  "01.03.02 Прикладная математика и информатика",
  "01.03.04 Прикладная математика",
  "01.03.05 Статистика",
  "02.03.02 Фундаментальная информатика и информационные технологии",
  "09.03.01 Информатика и вычислительная техника",
  "09.03.02 Информационные системы и технологии",
  "09.03.03 Прикладная информатика",
  "09.03.04 Программная инженерия",
  "27.03.05 Инноватика",
  "38.03.01 Экономика",
  "38.03.02 Менеджмент",
  "38.03.05 Бизнес-информатика",
  "38.03.06 Торговое дело",
];

export type ExamSubjectScore = {
  id: string;
  subject: string;
  score: number;
};

export type PriorityItem = {
  key: CriteriaKey;
  label: string;
  description: string;
};

export const priorityItems: Record<CriteriaKey, PriorityItem> = criteriaKeys.reduce(
  (items, key) => {
    items[key] = {
      key,
      label: criteriaLabels[key],
      description: criteriaDescriptions[key],
    };

    return items;
  },
  {} as Record<CriteriaKey, PriorityItem>,
);

export const defaultExamSubjects = (): ExamSubjectScore[] => [
  { id: "exam-russian", subject: "Русский язык", score: 80 },
  { id: "exam-math", subject: "Профильная математика", score: 80 },
  { id: "exam-third", subject: "Информатика", score: 80 },
];

export function movePriority(order: PriorityOrder, key: CriteriaKey, direction: "up" | "down"): PriorityOrder {
  const normalized = normalizePriorityOrder(order);
  const index = normalized.indexOf(key);

  if (index === -1) {
    return normalized;
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= normalized.length) {
    return normalized;
  }

  const next = [...normalized];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function cleanExamSubjects(subjects: ExamSubjectScore[]) {
  return subjects
    .map((subject) => ({
      ...subject,
      subject: subject.subject.trim(),
      score: Math.max(0, Math.min(100, Math.round(Number(subject.score) || 0))),
    }))
    .filter((subject) => subject.subject.length > 0)
    .slice(0, maxExamSubjects);
}

export function nextSubject(subjects: ExamSubjectScore[]) {
  const used = new Set(subjects.map((subject) => subject.subject));
  return examSubjectOptions.find((option) => !used.has(option)) ?? examSubjectOptions[0];
}