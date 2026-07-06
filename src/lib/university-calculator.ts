export type OlympiadBenefit = "bvi" | "hundred" | "none";

export type SpecialtyInput = {
  name: string;
  passingScore: number;
  tuitionCost: number;
  budgetSeats: number;
  paidSeats: number;
  interestScore: number;
  careerScore: number;
};

export type Specialty = SpecialtyInput & {
  id: number;
  universityId: number;
};

export type UniversityInput = {
  name: string;
  city: string;
  hasMilitaryDepartment: boolean;
  hasDormitory: boolean;
  commuteMinutes: number;
  olympiadBenefit: OlympiadBenefit;
  extraPoints: number;
  specialties: SpecialtyInput[];
};

export type University = Omit<UniversityInput, "specialties"> & {
  id: number;
  createdAt: string;
  specialties: Specialty[];
};

export type CriteriaKey = "admission" | "fit" | "logistics" | "finance" | "support";

export type Weights = Record<CriteriaKey, number>;

export type CriteriaScores = Record<CriteriaKey, number>;

export type RatedSpecialty = {
  id: string;
  university: University;
  specialty: Specialty;
  criteria: CriteriaScores;
  admissionMargin: number | null;
  effectiveExamScore: number | null;
  recommendation: "strong" | "balanced" | "risky";
  strengths: string[];
  risks: string[];
  score: number;
};

export const maxExamScore = 500;
export const hundredPointBenefitApproximation = 25;

export const defaultWeights: Weights = {
  admission: 40,
  fit: 20,
  logistics: 15,
  finance: 15,
  support: 10,
};

export const criteriaLabels: Record<CriteriaKey, string> = {
  admission: "Шанс поступления",
  fit: "Интерес и карьера",
  logistics: "Логистика",
  finance: "Финансы",
  support: "Поддержка",
};

export const criteriaDescriptions: Record<CriteriaKey, string> = {
  admission: "Сравнение вашего балла с проходным, индивидуальные достижения и олимпиадные льготы.",
  fit: "Личная заинтересованность в направлении и оценка карьерных перспектив.",
  logistics: "Чем меньше дорога до кампуса, тем выше оценка.",
  finance: "Стоимость платного обучения и наличие бюджетных мест.",
  support: "Общежитие и военный учебный центр как инфраструктурные плюсы.",
};

export const olympiadBenefitLabels: Record<OlympiadBenefit, string> = {
  bvi: "БВИ",
  hundred: "100 баллов за предмет",
  none: "Нет льготы",
};

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function finiteNumbers(values: number[]) {
  return values.filter((value) => Number.isFinite(value));
}

export function normalizeDirect(value: number, min: number, max: number) {
  if (max === min) {
    return 100;
  }

  return clamp(((value - min) / (max - min)) * 100);
}

export function normalizeInverse(value: number, min: number, max: number) {
  if (max === min) {
    return 100;
  }

  return clamp(100 - ((value - min) / (max - min)) * 100);
}

function range(values: number[]) {
  const cleanValues = finiteNumbers(values);

  if (cleanValues.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...cleanValues),
    max: Math.max(...cleanValues),
  };
}

export function calculateAdmissionScore(params: {
  userExamScore: number;
  extraPoints: number;
  passingScore: number;
  olympiadBenefit: OlympiadBenefit;
}) {
  if (params.olympiadBenefit === "bvi") {
    return { score: 100, margin: null, effectiveExamScore: null };
  }

  const olympiadBonus = params.olympiadBenefit === "hundred" ? hundredPointBenefitApproximation : 0;
  const effectiveExamScore = clamp(params.userExamScore + params.extraPoints + olympiadBonus, 0, maxExamScore);
  const margin = effectiveExamScore - params.passingScore;

  return {
    score: clamp(((margin + 50) / 110) * 100),
    margin,
    effectiveExamScore,
  };
}

function calculateFitScore(specialty: Specialty) {
  const interest = clamp(specialty.interestScore, 1, 5) * 20;
  const career = clamp(specialty.careerScore, 1, 5) * 20;

  return roundScore(interest * 0.55 + career * 0.45);
}

function calculateFinanceScore(params: {
  tuitionCost: number;
  budgetSeats: number;
  minTuition: number;
  maxTuition: number;
  minBudgetSeats: number;
  maxBudgetSeats: number;
}) {
  const tuitionScore = normalizeInverse(params.tuitionCost, params.minTuition, params.maxTuition);
  const budgetScore = normalizeDirect(params.budgetSeats, params.minBudgetSeats, params.maxBudgetSeats);

  return roundScore(tuitionScore * 0.65 + budgetScore * 0.35);
}

function calculateSupportScore(university: University) {
  const dormitoryScore = university.hasDormitory ? 100 : 0;
  const militaryScore = university.hasMilitaryDepartment ? 100 : 0;

  return roundScore(dormitoryScore * 0.6 + militaryScore * 0.4);
}

function getRecommendation(score: number, admissionMargin: number | null): RatedSpecialty["recommendation"] {
  if (score >= 78 && (admissionMargin === null || admissionMargin >= 0)) {
    return "strong";
  }

  if (score >= 58 && (admissionMargin === null || admissionMargin >= -15)) {
    return "balanced";
  }

  return "risky";
}

function explain(criteria: CriteriaScores, specialty: Specialty, university: University, admissionMargin: number | null) {
  const strengths: string[] = [];
  const risks: string[] = [];

  if (admissionMargin === null || admissionMargin >= 0) {
    strengths.push(admissionMargin === null ? "есть БВИ" : `запас к проходному ${admissionMargin} балл.`);
  } else {
    risks.push(`не хватает ${Math.abs(admissionMargin)} балл. до прошлогоднего проходного`);
  }

  if (criteria.fit >= 80) {
    strengths.push("направление хорошо совпадает с интересом и карьерными ожиданиями");
  }

  if (criteria.logistics >= 75) {
    strengths.push("удобная дорога до кампуса");
  } else if (criteria.logistics < 45) {
    risks.push("дорога заметно хуже, чем у других вариантов");
  }

  if (criteria.finance >= 75) {
    strengths.push("финансово сильный вариант");
  } else if (specialty.tuitionCost > 0 && criteria.finance < 45) {
    risks.push("стоимость обучения выше конкурирующих вариантов");
  }

  if (university.hasDormitory) {
    strengths.push("есть общежитие");
  }

  if (specialty.budgetSeats === 0) {
    risks.push("нет бюджетных мест");
  }

  return { strengths: strengths.slice(0, 3), risks: risks.slice(0, 3) };
}

export function calculateRatedSpecialties(
  universities: University[],
  userExamScore: number,
  weights: Weights,
): RatedSpecialty[] {
  const specialties = universities.flatMap((university) => university.specialties);
  const commuteRange = range(universities.map((university) => university.commuteMinutes));
  const tuitionRange = range(specialties.map((specialty) => specialty.tuitionCost));
  const budgetSeatsRange = range(specialties.map((specialty) => specialty.budgetSeats));

  return universities
    .flatMap((university) =>
      university.specialties.map((specialty) => {
        const admission = calculateAdmissionScore({
          userExamScore,
          extraPoints: university.extraPoints,
          passingScore: specialty.passingScore,
          olympiadBenefit: university.olympiadBenefit,
        });

        const criteria: CriteriaScores = {
          admission: admission.score,
          fit: calculateFitScore(specialty),
          logistics: normalizeInverse(university.commuteMinutes, commuteRange.min, commuteRange.max),
          finance: calculateFinanceScore({
            tuitionCost: specialty.tuitionCost,
            budgetSeats: specialty.budgetSeats,
            minTuition: tuitionRange.min,
            maxTuition: tuitionRange.max,
            minBudgetSeats: budgetSeatsRange.min,
            maxBudgetSeats: budgetSeatsRange.max,
          }),
          support: calculateSupportScore(university),
        };

        const score = (Object.keys(criteria) as CriteriaKey[]).reduce(
          (sum, key) => sum + criteria[key] * (weights[key] / 100),
          0,
        );
        const roundedScore = roundScore(score);
        const explanation = explain(criteria, specialty, university, admission.margin);

        return {
          id: `${university.id}-${specialty.id}`,
          university,
          specialty,
          criteria,
          admissionMargin: admission.margin,
          effectiveExamScore: admission.effectiveExamScore,
          recommendation: getRecommendation(roundedScore, admission.margin),
          strengths: explanation.strengths,
          risks: explanation.risks,
          score: roundedScore,
        };
      }),
    )
    .sort((left, right) => right.score - left.score);
}
