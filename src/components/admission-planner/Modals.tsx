import { criteriaDescriptions, criteriaLabels, optionalCriteriaKeys, type CriteriaKey, type DisabledCriteria, type PriorityOrder } from "@/lib/university-calculator";
import { movePriority } from "./config";

export function PriorityModal({
  priorityOrder,
  disabledCriteria,
  onClose,
  onPriorityChange,
  onDisabledCriteriaChange,
}: {
  priorityOrder: PriorityOrder;
  disabledCriteria: DisabledCriteria;
  onClose: () => void;
  onPriorityChange: (order: PriorityOrder) => void;
  onDisabledCriteriaChange: (criteria: DisabledCriteria) => void;
}) {
  function move(key: CriteriaKey, direction: "up" | "down") {
    onPriorityChange(movePriority(priorityOrder, key, direction));
  }

  function toggleDisabled(key: CriteriaKey) {
    if (!optionalCriteriaKeys.includes(key)) {
      return;
    }

    onDisabledCriteriaChange(disabledCriteria.includes(key) ? disabledCriteria.filter((item) => item !== key) : [...disabledCriteria, key]);
  }

  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Приоритеты сравнения</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Расставьте параметры по важности</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Верхние пункты сильнее влияют на рейтинг. Дорогу и общежитие можно отключить, если они не важны при выборе.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Закрыть
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {priorityOrder.map((key, index) => {
            const disabled = disabledCriteria.includes(key);
            const optional = optionalCriteriaKeys.includes(key);

            return (
              <div key={key} className={`flex gap-3 rounded-lg border p-3 ${disabled ? "border-slate-200 bg-slate-100 opacity-75" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-sm">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">{criteriaLabels[key]}</p>
                    {disabled && <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">не учитывается</span>}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{criteriaDescriptions[key]}</p>
                  {optional && (
                    <button type="button" onClick={() => toggleDisabled(key)} className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
                      {disabled ? "Учитывать параметр" : "Не учитывать параметр"}
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(key, "up")}
                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Поднять ${criteriaLabels[key]}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === priorityOrder.length - 1}
                    onClick={() => move(key, "down")}
                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Опустить ${criteriaLabels[key]}`}
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}