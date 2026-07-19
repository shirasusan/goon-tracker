import { TOUR_STEPS, type TourStepId } from '../lib/tour'

type CoachTourProps = {
  stepIndex: number
  onNext: () => void
  onSkip: () => void
  onAction: (stepId: TourStepId) => void
}

export function CoachTour({ stepIndex, onNext, onSkip, onAction }: CoachTourProps) {
  const step = TOUR_STEPS[Math.min(stepIndex, TOUR_STEPS.length - 1)]
  return (
    <div className="coach-tour" role="dialog" aria-modal="true" aria-labelledby="coach-tour-title">
      <div className="coach-tour__card">
        <p className="coach-tour__progress">
          {stepIndex + 1} / {TOUR_STEPS.length}
        </p>
        <h2 id="coach-tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="coach-tour__actions">
          <button type="button" className="btn" onClick={onSkip}>
            Überspringen
          </button>
          <button
            type="button"
            className="btn btn--solid"
            onClick={() => {
              onAction(step.id)
              onNext()
            }}
          >
            {step.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
