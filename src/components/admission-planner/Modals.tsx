import { criteriaDescriptions, criteriaLabels, type Weights } from "@/lib/university-calculator";
import {
  criteriaKeys,
  distributeWeights,
  surveyQuestions,
  weightPresets,
  weightsFromSurvey,
  type SurveyKey,
} from "./config";

export function SettingsModal({
  weights,
  totalWeight,
  onClose,
  onWeightsChange,
  onOpenSurvey,
}: {
  weights: Weights;
  totalWeight: number;
  onClose: () => void;
  onWeightsChange: (weights: Weights) => void;
  onOpenSurvey: () => void;
}) {
  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Настройки</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Веса критериев</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Здесь можно точно поправить веса после стартового опроса. Сумма всегда остается равной 100%.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Закрыть
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Σ {totalWeight}%</span>
          <button type="button" onClick={onOpenSurvey} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
            Пройти опрос заново
          </button>
          {Object.entries(weightPresets).map(([name, preset]) => (
            <button key={name} type="button" onClick={() => onWeightsChange(preset)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
              {name}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {criteriaKeys.map((key) => (
            <label key={key} className="block rounded-lg bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-bold text-slate-800">{criteriaLabels[key]}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{criteriaDescriptions[key]}</span>
                </span>
                <span className="rounded-lg bg-white px-3 py-1 text-sm font-black text-slate-950 shadow-sm">{weights[key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(event) => onWeightsChange(distributeWeights(weights, key, Number(event.target.value)))}
                className="mt-4 h-2 w-full accent-blue-600"
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SurveyModal({
  answers,
  onAnswer,
  onApply,
  onClose,
  canClose,
}: {
  answers: Record<SurveyKey, number>;
  onAnswer: (key: SurveyKey, optionIndex: number) => void;
  onApply: () => void;
  onClose: () => void;
  canClose: boolean;
}) {
  const previewWeights = weightsFromSurvey(answers);

  return (
    <section className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Опрос приоритетов</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Настроим рейтинг под вас</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Ответьте на короткие вопросы: так калькулятор сам выставит веса вместо ручной настройки.</p>
          </div>
          {canClose && (
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Закрыть
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-5">
            {surveyQuestions.map((question) => (
              <fieldset key={question.key} className="rounded-lg border border-slate-200 p-4">
                <legend className="px-1 text-sm font-black text-slate-950">{question.question}</legend>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.key] === optionIndex;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => onAnswer(question.key, optionIndex)}
                        className={`rounded-lg border p-4 text-left transition ${
                          selected ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block text-sm font-black text-slate-950">{option.label}</span>
                        <span className="mt-2 block text-xs leading-5 text-slate-500">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <aside className="h-fit rounded-lg bg-slate-950 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Получатся веса</p>
            <div className="mt-4 space-y-3">
              {criteriaKeys.map((key) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{criteriaLabels[key]}</span>
                    <span className="font-black">{previewWeights[key]}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${previewWeights[key]}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={onApply} className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-blue-50">
              Применить веса
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}