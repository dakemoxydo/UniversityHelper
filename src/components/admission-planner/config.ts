import { defaultWeights, type CriteriaKey, type Weights } from "@/lib/university-calculator";

export const criteriaKeys: CriteriaKey[] = ["admission", "fit", "logistics", "finance", "support"];
export const localStorageKey = "university-helper-draft-v2";
export const profileStorageKey = "university-helper-profile-v1";
export const weightsStorageKey = "university-helper-weights-v1";
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

export type ExamSubjectScore = {
  id: string;
  subject: string;
  score: number;
};

export type SurveyKey = "goal" | "commute" | "money" | "support" | "risk";

export type SurveyOption = {
  label: string;
  description: string;
  weights: Partial<Weights>;
};

export type SurveyQuestion = {
  key: SurveyKey;
  question: string;
  options: SurveyOption[];
};

export const surveyQuestions: SurveyQuestion[] = [
  {
    key: "goal",
    question: "Что для вас важнее всего при выборе направления?",
    options: [
      { label: "Надежно поступить", description: "Рейтинг сильнее смотрит на проходной балл и запас по ЕГЭ.", weights: { admission: 34, fit: 8 } },
      { label: "Учиться интересному", description: "Больше веса получает личный интерес и карьерный потенциал.", weights: { fit: 34, admission: 8 } },
      { label: "Не переплачивать", description: "Финансы и бюджетные места станут заметно важнее.", weights: { finance: 34, admission: 8 } },
    ],
  },
  {
    key: "commute",
    question: "Что важнее: короткая дорога или сильный вариант подальше?",
    options: [
      { label: "Короткая дорога", description: "Логистика заметно поднимет близкие кампусы.", weights: { logistics: 34, support: 6 } },
      { label: "Готов ездить", description: "Дорога будет вторичной, если программа и шанс поступления сильные.", weights: { fit: 16, admission: 16 } },
      { label: "Главное город и быт", description: "Вес получат дорога, общежитие и инфраструктура.", weights: { logistics: 20, support: 18 } },
    ],
  },
  {
    key: "money",
    question: "Насколько критична стоимость обучения?",
    options: [
      { label: "Нужен бюджет", description: "Финансовый критерий станет одним из главных.", weights: { finance: 36, admission: 10 } },
      { label: "Платное возможно", description: "Цена важна, но не перекрывает качество варианта.", weights: { finance: 16, fit: 18 } },
      { label: "Не главный фактор", description: "Финансы останутся в модели, но без доминирования.", weights: { fit: 18, admission: 14 } },
    ],
  },
  {
    key: "support",
    question: "Нужны ли ВУЦ, общежитие и похожая инфраструктура?",
    options: [
      { label: "Да, очень", description: "ВУЦ и общежитие будут заметно влиять на топ.", weights: { support: 34, logistics: 8 } },
      { label: "Как бонус", description: "Инфраструктура поможет, но не решит все за вас.", weights: { support: 18, finance: 10 } },
      { label: "Не важно", description: "Рейтинг почти не будет штрафовать варианты без поддержки.", weights: { admission: 14, fit: 14, finance: 8 } },
    ],
  },
  {
    key: "risk",
    question: "Какой риск поступления комфортен?",
    options: [
      { label: "Лучше безопасно", description: "Варианты с запасом к проходному поднимутся выше.", weights: { admission: 38 } },
      { label: "Нужен баланс", description: "Шанс поступления важен, но не единственный фактор.", weights: { admission: 20, fit: 16, finance: 8 } },
      { label: "Готов рискнуть", description: "Модель позволит мечте и карьерному интересу конкурировать с проходным.", weights: { fit: 34, admission: 8 } },
    ],
  },
];

export const defaultSurveyAnswers: Record<SurveyKey, number> = {
  goal: 0,
  commute: 0,
  money: 0,
  support: 1,
  risk: 1,
};

export const weightPresets: Record<string, Weights> = {
  Сбалансировано: defaultWeights,
  "Поступить надежнее": { admission: 62, fit: 12, logistics: 8, finance: 12, support: 6 },
  Дешевле: { admission: 30, fit: 14, logistics: 8, finance: 38, support: 10 },
  "Ближе и удобнее": { admission: 28, fit: 14, logistics: 34, finance: 10, support: 14 },
  "Карьера и интерес": { admission: 28, fit: 42, logistics: 10, finance: 10, support: 10 },
};

export const defaultExamSubjects = (): ExamSubjectScore[] => [
  { id: "exam-russian", subject: "Русский язык", score: 80 },
  { id: "exam-math", subject: "Профильная математика", score: 80 },
  { id: "exam-third", subject: "Информатика", score: 80 },
];

export function normalizeWeights(rawWeights: Weights): Weights {
  const total = criteriaKeys.reduce((sum, key) => sum + rawWeights[key], 0) || 1;
  let used = 0;
  const result = { ...rawWeights };

  criteriaKeys.forEach((key, index) => {
    const value = index === criteriaKeys.length - 1 ? 100 - used : Math.round((rawWeights[key] / total) * 100);
    result[key] = value;
    used += value;
  });

  return result;
}

export function distributeWeights(current: Weights, changedKey: CriteriaKey, nextValue: number): Weights {
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

export function weightsFromSurvey(answers: Record<SurveyKey, number>): Weights {
  const rawWeights: Weights = { admission: 12, fit: 12, logistics: 10, finance: 10, support: 8 };

  surveyQuestions.forEach((question) => {
    const answerIndex = answers[question.key] ?? 0;
    const option = question.options[answerIndex] ?? question.options[0];

    criteriaKeys.forEach((key) => {
      rawWeights[key] += option.weights[key] ?? 0;
    });
  });

  return normalizeWeights(rawWeights);
}

export function cleanExamSubjects(subjects: ExamSubjectScore[]) {
  return subjects
    .map((subject) => ({
      ...subject,
      subject: subject.subject.trim(),
      score: Math.max(0, Math.min(100, Math.round(Number(subject.score) || 0))),
    }))
    .filter((subject) => subject.subject.length > 0);
}

export function nextSubject(currentSubjects: ExamSubjectScore[]) {
  const usedSubjects = new Set(currentSubjects.map((subject) => subject.subject));
  return examSubjectOptions.find((subject) => !usedSubjects.has(subject)) ?? examSubjectOptions[0];
}