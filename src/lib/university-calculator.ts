export type AdmissionBasis = "budget" | "paid" | "both";

export type SpecialtyInput = {
  id?: number;
  name: string;
  direction: string;
  admissionBasis: AdmissionBasis;
  tuitionCost: number;
  budgetSeats: number;
  budgetPassingScore: number;
  budgetAverageScore: number;
  budgetMaxScore: number;
  paidSeats: number;
  paidPassingScore: number;
  paidAverageScore: number;
  paidMaxScore: number;
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
  specialties: SpecialtyInput[];
};

export type University = Omit<UniversityInput, "specialties"> & {
  id: number;
  createdAt: string;
  specialties: Specialty[];
};

export type CriteriaKey = "budgetPlaces" | "paidPlaces" | "budgetScores" | "paidScores" | "tuition" | "commute" | "dormitory" | "military";

export type CriteriaScores = Record<CriteriaKey, number>;
export type PriorityOrder = CriteriaKey[];
export type DisabledCriteria = CriteriaKey[];
export type Weights = Record<CriteriaKey, number>;

export type RatedSpecialty = {
  id: string;
  university: University;
  specialty: Specialty;
  criteria: CriteriaScores;
  priorityWeights: Weights;
  matchLevel: "high" | "medium" | "low";
  strengths: string[];
  notes: string[];
  score: number;
};


export const defaultPriorityOrder: PriorityOrder = ["budgetPlaces", "budgetScores", "paidPlaces", "tuition", "commute", "dormitory", "military", "paidScores"];
export const optionalCriteriaKeys: CriteriaKey[] = ["commute", "dormitory"];

export const criteriaLabels: Record<CriteriaKey, string> = {
  budgetPlaces: "Бюджетные места",
  paidPlaces: "Платные места",
  budgetScores: "Баллы бюджета",
  paidScores: "Баллы платного",
  tuition: "Стоимость обучения",
  commute: "Время до вуза",
  dormitory: "Общежитие",
  military: "ВУЦ",
};

export const criteriaDescriptions: Record<CriteriaKey, string> = {
  budgetPlaces: "Количество бюджетных мест на профиле относительно других вариантов.",
  paidPlaces: "Количество платных мест на профиле относительно других вариантов.",
  budgetScores: "Проходной, средний и максимальный баллы поступивших на бюджет.",
  paidScores: "Проходной, средний и максимальный баллы поступивших на платное.",
  tuition: "Стоимость платного обучения в год. Меньше стоимость - выше оценка.",
  commute: "Время до университета. Можно отключить, если дорога не важна.",
  dormitory: "Наличие общежития. Можно отключить, если общежитие не важно.",
  military: "Наличие военного учебного центра как отдельный факт для сравнения.",
};

export const admissionBasisLabels: Record<AdmissionBasis, string> = {
  budget: "только бюджет",
  paid: "только платное",
  both: "бюджет и платное",
};


export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function knownValues(values: Array<number | null>) {
  return values.filter((value): value is number => value !== null);
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

function range(values: Array<number | null>) {
  const cleanValues = knownValues(values);

  if (cleanValues.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...cleanValues),
    max: Math.max(...cleanValues),
  };
}

function normalizeDirectKnown(value: number | null, min: number, max: number) {
  return value === null ? 0 : normalizeDirect(value, min, max);
}

function normalizeInverseKnown(value: number | null, min: number, max: number) {
  return value === null ? 0 : normalizeInverse(value, min, max);
}

function neutralWhenNotApplicable() {
  return 50;
}

function admissionBasis(specialty: Partial<SpecialtyInput>) {
  return specialty.admissionBasis ?? "both";
}

function hasBudget(specialty: Partial<SpecialtyInput>) {
  const basis = admissionBasis(specialty);
  return basis === "budget" || basis === "both";
}

function hasPaid(specialty: Partial<SpecialtyInput>) {
  const basis = admissionBasis(specialty);
  return basis === "paid" || basis === "both";
}

export function normalizePriorityOrder(order: CriteriaKey[]): PriorityOrder {
  const known = new Set(defaultPriorityOrder);
  const clean = order.filter((key): key is CriteriaKey => known.has(key));
  const missing = defaultPriorityOrder.filter((key) => !clean.includes(key));

  return [...clean, ...missing];
}

export function normalizeDisabledCriteria(disabledCriteria: CriteriaKey[]): DisabledCriteria {
  return disabledCriteria.filter((key, index, list) => optionalCriteriaKeys.includes(key) && list.indexOf(key) === index);
}

export function weightsFromPriorityOrder(order: PriorityOrder, disabledCriteria: DisabledCriteria = []): Weights {
  const disabled = new Set(normalizeDisabledCriteria(disabledCriteria));
  const normalized = normalizePriorityOrder(order);
  const active = normalized.filter((key) => !disabled.has(key));
  const baseScores = active.map((_, index) => active.length - index);
  const total = baseScores.reduce((sum, value) => sum + value, 0) || 1;
  let used = 0;
  const weights = normalized.reduce((result, key) => ({ ...result, [key]: 0 }), {} as Weights);

  active.forEach((key, index) => {
    const value = index === active.length - 1 ? 100 - used : Math.round((baseScores[index] / total) * 100);
    used += value;
    weights[key] = value;
  });

  return weights;
}

function boolScore(value: boolean) {
  return value ? 100 : 0;
}

function scoreAdmissionStats(values: Array<number | null>, ranges: Array<{ min: number; max: number }>) {
  const scores = values.map((value, index) => normalizeInverseKnown(value, ranges[index].min, ranges[index].max));
  return roundScore(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function matchLevel(score: number): RatedSpecialty["matchLevel"] {
  if (score >= 76) {
    return "high";
  }

  if (score >= 52) {
    return "medium";
  }

  return "low";
}

function explain(criteria: CriteriaScores, specialty: Specialty, university: University, disabledCriteria: DisabledCriteria) {
  const strengths: string[] = [];
  const notes: string[] = [];
  const disabled = new Set(disabledCriteria);

  if (hasBudget(specialty) && criteria.budgetPlaces >= 75) {
    strengths.push("много бюджетных мест относительно других вариантов");
  } else if (hasBudget(specialty) && positiveValue(specialty.budgetSeats) === null) {
    notes.push("бюджет включен, но мест не указано");
  }

  if (hasPaid(specialty) && criteria.paidPlaces >= 75) {
    strengths.push("много платных мест относительно других вариантов");
  } else if (hasPaid(specialty) && positiveValue(specialty.paidSeats) === null) {
    notes.push("платное включено, но мест не указано");
  }

  if (hasPaid(specialty) && criteria.tuition >= 75) {
    strengths.push("стоимость ниже большинства сравниваемых вариантов");
  } else if (hasPaid(specialty) && criteria.tuition < 35) {
    notes.push("стоимость выше большинства сравниваемых вариантов");
  }

  if (!disabled.has("commute")) {
    if (criteria.commute >= 75) {
      strengths.push("дорога короче, чем у большинства вариантов");
    } else if (criteria.commute < 35) {
      notes.push("дорога дольше, чем у большинства вариантов");
    }
  }

  if (!disabled.has("dormitory") && university.hasDormitory) {
    strengths.push("есть общежитие");
  }

  if (university.hasMilitaryDepartment) {
    strengths.push("есть ВУЦ");
  }

  return { strengths: strengths.slice(0, 3), notes: notes.slice(0, 3) };
}

export function calculateRatedSpecialties(
  universities: University[],
  priorityOrder: PriorityOrder = defaultPriorityOrder,
  disabledCriteria: DisabledCriteria = [],
): RatedSpecialty[] {
  const specialties = universities.flatMap((university) => university.specialties);
  const commuteRange = range(universities.map((university) => numberValue(university.commuteMinutes)));
  const budgetSeatsRange = range(specialties.filter(hasBudget).map((specialty) => positiveValue(specialty.budgetSeats)));
  const paidSeatsRange = range(specialties.filter(hasPaid).map((specialty) => positiveValue(specialty.paidSeats)));
  const tuitionRange = range(specialties.filter(hasPaid).map((specialty) => positiveValue(specialty.tuitionCost)));
  const budgetPassingRange = range(specialties.filter(hasBudget).map((specialty) => positiveValue(specialty.budgetPassingScore)));
  const budgetAverageRange = range(specialties.filter(hasBudget).map((specialty) => positiveValue(specialty.budgetAverageScore)));
  const budgetMaxRange = range(specialties.filter(hasBudget).map((specialty) => positiveValue(specialty.budgetMaxScore)));
  const paidPassingRange = range(specialties.filter(hasPaid).map((specialty) => positiveValue(specialty.paidPassingScore)));
  const paidAverageRange = range(specialties.filter(hasPaid).map((specialty) => positiveValue(specialty.paidAverageScore)));
  const paidMaxRange = range(specialties.filter(hasPaid).map((specialty) => positiveValue(specialty.paidMaxScore)));
  const normalizedDisabledCriteria = normalizeDisabledCriteria(disabledCriteria);
  const priorityWeights = weightsFromPriorityOrder(priorityOrder, normalizedDisabledCriteria);

  return universities
    .flatMap((university) =>
      university.specialties.map((specialty) => {
        const includesBudget = hasBudget(specialty);
        const includesPaid = hasPaid(specialty);
        const criteria: CriteriaScores = {
          budgetPlaces: includesBudget ? normalizeDirectKnown(positiveValue(specialty.budgetSeats), budgetSeatsRange.min, budgetSeatsRange.max) : 0,
          paidPlaces: includesPaid ? normalizeDirectKnown(positiveValue(specialty.paidSeats), paidSeatsRange.min, paidSeatsRange.max) : 0,
          budgetScores: includesBudget
            ? scoreAdmissionStats(
                [specialty.budgetPassingScore, specialty.budgetAverageScore, specialty.budgetMaxScore].map(positiveValue),
                [budgetPassingRange, budgetAverageRange, budgetMaxRange],
              )
            : 0,
          paidScores: includesPaid
            ? scoreAdmissionStats(
                [specialty.paidPassingScore, specialty.paidAverageScore, specialty.paidMaxScore].map(positiveValue),
                [paidPassingRange, paidAverageRange, paidMaxRange],
              )
            : 0,
          tuition: includesPaid ? normalizeInverseKnown(positiveValue(specialty.tuitionCost), tuitionRange.min, tuitionRange.max) : neutralWhenNotApplicable(),
          commute: normalizeInverse(numberValue(university.commuteMinutes), commuteRange.min, commuteRange.max),
          dormitory: boolScore(university.hasDormitory),
          military: boolScore(university.hasMilitaryDepartment),
        };

        const score = (Object.keys(criteria) as CriteriaKey[]).reduce(
          (sum, key) => sum + criteria[key] * (priorityWeights[key] / 100),
          0,
        );
        const roundedScore = roundScore(score);
        const explanation = explain(criteria, specialty, university, normalizedDisabledCriteria);

        return {
          id: `${university.id}-${specialty.id}`,
          university,
          specialty,
          criteria,
          priorityWeights,
          matchLevel: matchLevel(roundedScore),
          strengths: explanation.strengths,
          notes: explanation.notes,
          score: roundedScore,
        };
      }),
    )
    .sort((left, right) => right.score - left.score);
}