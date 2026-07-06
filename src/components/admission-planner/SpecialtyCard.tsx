import { admissionBasisLabels, criteriaLabels, type RatedSpecialty, type Specialty } from "@/lib/university-calculator";

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

function matchLabel(value: RatedSpecialty["matchLevel"]) {
  if (value === "high") {
    return "сильное совпадение";
  }

  if (value === "medium") {
    return "среднее совпадение";
  }

  return "низкое совпадение";
}

function matchClass(value: RatedSpecialty["matchLevel"]) {
  if (value === "high") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (value === "medium") {
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

function formatValue(value: number) {
  return value > 0 ? value : "-";
}

function AdmissionRow({ title, specialty, mode }: { title: string; specialty: Specialty; mode: "budget" | "paid" }) {
  const isBudget = mode === "budget";

  return (
    <div className="grid min-w-[620px] grid-cols-[9rem_repeat(4,minmax(6rem,1fr))] items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0">
      <span className={isBudget ? "text-sm font-black text-emerald-700" : "text-sm font-black text-blue-700"}>{title}</span>
      <span className="text-sm font-semibold text-slate-950">{formatValue(isBudget ? specialty.budgetSeats : specialty.paidSeats)}</span>
      <span className="text-sm font-semibold text-slate-950">{formatValue(isBudget ? specialty.budgetPassingScore : specialty.paidPassingScore)}</span>
      <span className="text-sm font-semibold text-slate-950">{formatValue(isBudget ? specialty.budgetAverageScore : specialty.paidAverageScore)}</span>
      <span className="text-sm font-semibold text-slate-950">{formatValue(isBudget ? specialty.budgetMaxScore : specialty.paidMaxScore)}</span>
    </div>
  );
}

export function SpecialtyCard({
  item,
  userExamScore,
  onEditUniversity,
  onDeleteUniversity,
}: {
  item: RatedSpecialty;
  userExamScore: number;
  onEditUniversity: (id: number) => void;
  onDeleteUniversity: (id: number) => void;
}) {
  const orderedCriteria = Object.keys(item.priorityWeights).sort((left, right) => item.priorityWeights[right as keyof typeof item.priorityWeights] - item.priorityWeights[left as keyof typeof item.priorityWeights]) as Array<keyof typeof item.criteria>;
  const visibleCriteria = orderedCriteria.filter((key) => item.priorityWeights[key] > 0);
  const showBudget = item.specialty.admissionBasis === "budget" || item.specialty.admissionBasis === "both";
  const showPaid = item.specialty.admissionBasis === "paid" || item.specialty.admissionBasis === "both";
  const facts = [
    `${item.university.commuteMinutes} мин. до вуза`,
    item.university.hasDormitory ? "общежитие есть" : "общежития нет",
    item.university.hasMilitaryDepartment ? "ВУЦ есть" : "ВУЦ нет",
    showPaid ? `платное ${formatCurrency(item.specialty.tuitionCost)}` : null,
  ].filter(Boolean);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 ${scoreTone(item.score)}`} />
      <div className="p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.university.name}</span>
              {item.university.city && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.university.city}</span>}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{admissionBasisLabels[item.specialty.admissionBasis]}</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${matchClass(item.matchLevel)}`}>{matchLabel(item.matchLevel)}</span>
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{item.specialty.name}</h3>
            {item.specialty.direction && <p className="mt-1 text-sm font-semibold text-blue-700">{item.specialty.direction}</p>}
            <p className="mt-3 text-sm leading-6 text-slate-600">{facts.join(" · ")}</p>
          </div>

          <div className="grid grid-cols-[7rem_1fr] gap-3 sm:min-w-80">
            <div className="rounded-lg bg-slate-950 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Итог</p>
              <p className="mt-1 text-4xl font-black">{item.score}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-bold text-slate-950">Почему так</p>
              <p className="mt-1">{(item.strengths[0] ?? "сбалансированный набор фактических данных")}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
          <div className="grid min-w-[620px] grid-cols-[9rem_repeat(4,minmax(6rem,1fr))] gap-3 border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <span>Основа</span>
            <span>Места</span>
            <span>Проходной</span>
            <span>Средний</span>
            <span>Максимальный</span>
          </div>
          {showBudget && <AdmissionRow title="Бюджет" specialty={item.specialty} mode="budget" />}
          {showPaid && <AdmissionRow title="Платное" specialty={item.specialty} mode="paid" />}
        </div>

        <details className="mt-5 rounded-lg border border-slate-200 bg-white open:bg-slate-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-700 outline-none transition hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100">Разбивка оценки и что проверить</summary>
          <div className="border-t border-slate-200 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              {visibleCriteria.map((key) => (
                <div key={key} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
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

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-slate-950">Сильные стороны</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {(item.strengths.length ? item.strengths : ["сбалансированный набор фактических показателей"]).map((text) => (
                    <li key={text}>+ {text}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Что проверить</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {(item.notes.length ? item.notes : ["уточнить актуальные данные приемной кампании"]).map((text) => (
                    <li key={text}>- {text}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">Ваши баллы ЕГЭ: {userExamScore}. Они показываются для справки и не участвуют в рейтинге.</p>
          </div>
        </details>

        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onEditUniversity(item.university.id)} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
            Редактировать вуз
          </button>
          <button type="button" onClick={() => onDeleteUniversity(item.university.id)} className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
            Удалить вуз
          </button>
        </div>
      </div>
    </article>
  );
}
