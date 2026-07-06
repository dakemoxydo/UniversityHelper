import { criteriaLabels, olympiadBenefitLabels, type RatedSpecialty } from "@/lib/university-calculator";
import { criteriaKeys } from "./config";

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

export function SpecialtyCard({ item, onDeleteUniversity }: { item: RatedSpecialty; onDeleteUniversity: (id: number) => void }) {
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