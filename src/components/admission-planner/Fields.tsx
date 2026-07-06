import type { AdmissionBasis, SpecialtyInput } from "@/lib/university-calculator";
import { admissionBasisLabels } from "@/lib/university-calculator";
import { directionOptions, examSubjectOptions, maxExamSubjects, type ExamSubjectScore } from "./config";

const inputClass = "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function NumberField({
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
      <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className={inputClass} />
    </label>
  );
}

function CompactNumberInput({
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
  return <input aria-label={label} type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />;
}

export function ExamProfileEditor({
  subjects,
  totalScore,
  onChange,
  onAdd,
  onRemove,
}: {
  subjects: ExamSubjectScore[];
  totalScore: number;
  onChange: (id: string, patch: Partial<ExamSubjectScore>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const profileReady = subjects.length >= 3;

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">Предметы ЕГЭ</p>
          <p className="text-xs text-slate-400">Минимум 3 предмета. Баллы сохраняются для справки и не меняют рейтинг.</p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-xs font-bold ${profileReady ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
          {profileReady ? "профиль готов" : "нужно 3"}
        </span>
      </div>

      <div className="space-y-2">
        {subjects.map((subject) => (
          <div key={subject.id} className="grid grid-cols-[1fr_5.5rem_auto] gap-2 rounded-lg bg-white/10 p-2">
            <select value={subject.subject} onChange={(event) => onChange(subject.id, { subject: event.target.value })} className="min-w-0 rounded-md border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-400/20">
              {examSubjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input type="number" min={0} max={100} value={subject.score} onChange={(event) => onChange(subject.id, { score: Number(event.target.value) })} className="rounded-md border border-white/10 bg-slate-900 px-2 py-2 text-sm font-bold text-white outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-400/20" />
            <button type="button" disabled={subjects.length <= 3} onClick={() => onRemove(subject.id)} className="rounded-md border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Удалить предмет">
              x
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onAdd} disabled={subjects.length >= maxExamSubjects} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45">
          Добавить предмет
        </button>
        <div className="rounded-lg bg-white p-3 text-slate-950">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Сумма</p>
          <p className="text-2xl font-black">{totalScore}</p>
        </div>
      </div>
    </div>
  );
}

function BasisButton({
  value,
  current,
  onChange,
}: {
  value: AdmissionBasis;
  current: AdmissionBasis;
  onChange: (value: AdmissionBasis) => void;
}) {
  const active = value === current;

  return (
    <button type="button" onClick={() => onChange(value)} className={active ? "min-h-11 rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 ring-4 ring-blue-100" : "min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"}>
      {admissionBasisLabels[value]}
    </button>
  );
}

function AdmissionStatsRow({
  title,
  mode,
  specialty,
  onChange,
}: {
  title: string;
  mode: "budget" | "paid";
  specialty: SpecialtyInput;
  onChange: (patch: Partial<SpecialtyInput>) => void;
}) {
  const isBudget = mode === "budget";
  const seatsKey = isBudget ? "budgetSeats" : "paidSeats";
  const passingKey = isBudget ? "budgetPassingScore" : "paidPassingScore";
  const averageKey = isBudget ? "budgetAverageScore" : "paidAverageScore";
  const maxKey = isBudget ? "budgetMaxScore" : "paidMaxScore";
  const seats = isBudget ? specialty.budgetSeats : specialty.paidSeats;
  const passing = isBudget ? specialty.budgetPassingScore : specialty.paidPassingScore;
  const average = isBudget ? specialty.budgetAverageScore : specialty.paidAverageScore;
  const max = isBudget ? specialty.budgetMaxScore : specialty.paidMaxScore;

  return (
    <div className="grid min-w-[720px] grid-cols-[11rem_repeat(4,minmax(7rem,1fr))] items-center gap-2 border-t border-slate-100 px-3 py-3 first:border-t-0">
      <div>
        <p className={isBudget ? "text-sm font-black text-emerald-700" : "text-sm font-black text-blue-700"}>{title}</p>
        <p className="text-xs text-slate-500">данные специальности</p>
      </div>
      <CompactNumberInput label={`${title}: места`} value={seats} min={0} max={10_000} onChange={(value) => onChange({ [seatsKey]: value })} />
      <CompactNumberInput label={`${title}: проходной балл`} value={passing} min={0} max={500} onChange={(value) => onChange({ [passingKey]: value })} />
      <CompactNumberInput label={`${title}: средний балл`} value={average} min={0} max={500} onChange={(value) => onChange({ [averageKey]: value })} />
      <CompactNumberInput label={`${title}: максимальный балл`} value={max} min={0} max={500} onChange={(value) => onChange({ [maxKey]: value })} />
    </div>
  );
}

export function SpecialtyFields({
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
  const showBudget = specialty.admissionBasis === "budget" || specialty.admissionBasis === "both";
  const showPaid = specialty.admissionBasis === "paid" || specialty.admissionBasis === "both";
  const directionListId = `direction-options-${index}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Профиль обучения {index + 1}</h3>
          <p className="mt-1 text-sm text-slate-500">Название профиля, направление и данные приема.</p>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="self-start rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 sm:self-auto">
            Удалить
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label>
          <span className="text-sm font-medium text-slate-700">Профиль обучения</span>
          <input value={specialty.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Например, Бизнес Аналитика" className={inputClass} />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Направление подготовки</span>
          <input list={directionListId} value={specialty.direction} onChange={(event) => onChange({ direction: event.target.value })} placeholder="Например, 01.03.05 Статистика" className={inputClass} />
          <datalist id={directionListId}>
            {directionOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_16rem] lg:items-end">
        <div>
          <span className="text-sm font-medium text-slate-700">Какие данные заполнять</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <BasisButton value="budget" current={specialty.admissionBasis} onChange={(value) => onChange({ admissionBasis: value })} />
            <BasisButton value="paid" current={specialty.admissionBasis} onChange={(value) => onChange({ admissionBasis: value })} />
            <BasisButton value="both" current={specialty.admissionBasis} onChange={(value) => onChange({ admissionBasis: value })} />
          </div>
        </div>
        {showPaid && <NumberField label="Стоимость платного обучения в год" value={specialty.tuitionCost} min={0} max={5_000_000} step={1000} onChange={(value) => onChange({ tuitionCost: value })} />}
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
        <div className="grid min-w-[720px] grid-cols-[11rem_repeat(4,minmax(7rem,1fr))] gap-2 border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          <span>Основа</span>
          <span>Места</span>
          <span>Проходной</span>
          <span>Средний</span>
          <span>Максимальный</span>
        </div>
        {showBudget && <AdmissionStatsRow title="Бюджет" mode="budget" specialty={specialty} onChange={onChange} />}
        {showPaid && <AdmissionStatsRow title="Платное" mode="paid" specialty={specialty} onChange={onChange} />}
      </div>
    </div>
  );
}
