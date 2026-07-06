import type { SpecialtyInput } from "@/lib/university-calculator";
import { examSubjectOptions, maxExamSubjects, type ExamSubjectScore } from "./config";

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
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function ScaleField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-950">{value}/5</span>
      </div>
      <input type="range" min={1} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-blue-600" />
    </label>
  );
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
          <p className="text-xs text-slate-400">Минимум 3 предмета, каждый по шкале 0-100.</p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-xs font-bold ${profileReady ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
          {profileReady ? "профиль готов" : "нужно 3"}
        </span>
      </div>

      <div className="space-y-2">
        {subjects.map((subject) => (
          <div key={subject.id} className="grid grid-cols-[1fr_5.5rem_auto] gap-2 rounded-lg bg-white/10 p-2">
            <select
              value={subject.subject}
              onChange={(event) => onChange(subject.id, { subject: event.target.value })}
              className="min-w-0 rounded-md border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-400/20"
            >
              {examSubjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={subject.score}
              onChange={(event) => onChange(subject.id, { score: Number(event.target.value) })}
              className="rounded-md border border-white/10 bg-slate-900 px-2 py-2 text-sm font-bold text-white outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-400/20"
            />
            <button
              type="button"
              disabled={subjects.length <= 3}
              onClick={() => onRemove(subject.id)}
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Удалить предмет"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onAdd}
          disabled={subjects.length >= maxExamSubjects}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
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
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Направление {index + 1}</h3>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
            Удалить
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Название специальности</span>
          <input
            value={specialty.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Например, Прикладная информатика"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <NumberField label="Проходной балл" value={specialty.passingScore} min={0} max={500} onChange={(value) => onChange({ passingScore: value })} />
        <NumberField label="Стоимость в год" value={specialty.tuitionCost} min={0} max={5_000_000} step={1000} onChange={(value) => onChange({ tuitionCost: value })} />
        <NumberField label="Бюджетные места" value={specialty.budgetSeats} min={0} max={10_000} onChange={(value) => onChange({ budgetSeats: value })} />
        <NumberField label="Платные места" value={specialty.paidSeats} min={0} max={10_000} onChange={(value) => onChange({ paidSeats: value })} />

        <ScaleField label="Мой интерес" value={specialty.interestScore} onChange={(value) => onChange({ interestScore: value })} />
        <ScaleField label="Карьера" value={specialty.careerScore} onChange={(value) => onChange({ careerScore: value })} />
      </div>
    </div>
  );
}