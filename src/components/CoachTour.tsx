import { useEffect, useLayoutEffect, useState } from 'react'
import { TOUR_STEPS } from '../lib/tour'
import { useLocale } from '../lib/LocaleContext'

type CoachTourProps = {
  stepIndex: number
  onNext: () => void
  onSkip: () => void
}

type Spot = { top: number; left: number; width: number; height: number }
type CardPos = { top: number; left: number; placement: 'above' | 'below' | 'left' | 'right' }

const CARD_W = 300
const CARD_GAP = 12
const PAD = 10

function measure(selector: string | null): Spot | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  }
}

function placeCard(spot: Spot | null): CardPos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardH = 200

  if (!spot) {
    return {
      top: Math.max(PAD, vh - cardH - 96),
      left: Math.max(PAD, (vw - CARD_W) / 2),
      placement: 'below',
    }
  }

  const below = spot.top + spot.height + CARD_GAP
  const above = spot.top - CARD_GAP - cardH
  const right = spot.left + spot.width + CARD_GAP
  const left = spot.left - CARD_GAP - CARD_W

  if (below + cardH <= vh - PAD) {
    return {
      top: below,
      left: clamp(spot.left + spot.width / 2 - CARD_W / 2, PAD, vw - CARD_W - PAD),
      placement: 'below',
    }
  }
  if (above >= PAD) {
    return {
      top: above,
      left: clamp(spot.left + spot.width / 2 - CARD_W / 2, PAD, vw - CARD_W - PAD),
      placement: 'above',
    }
  }
  if (right + CARD_W <= vw - PAD) {
    return {
      top: clamp(spot.top, PAD, vh - cardH - PAD),
      left: right,
      placement: 'right',
    }
  }
  if (left >= PAD) {
    return {
      top: clamp(spot.top, PAD, vh - cardH - PAD),
      left: left,
      placement: 'left',
    }
  }
  return {
    top: clamp(below, PAD, vh - cardH - PAD),
    left: clamp(spot.left, PAD, vw - CARD_W - PAD),
    placement: 'below',
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function CoachTour({ stepIndex, onNext, onSkip }: CoachTourProps) {
  const { t } = useLocale()
  const step = TOUR_STEPS[Math.min(stepIndex, TOUR_STEPS.length - 1)]
  const [spot, setSpot] = useState<Spot | null>(null)
  const [card, setCard] = useState<CardPos>(() => placeCard(null))

  useLayoutEffect(() => {
    let tries = 0
    let raf = 0
    let timer = 0

    function tick() {
      const next = measure(step.anchor)
      setSpot(next)
      setCard(placeCard(next))
      if (!next && step.anchor && tries < 20) {
        tries += 1
        timer = window.setTimeout(() => {
          raf = window.requestAnimationFrame(tick)
        }, 50)
      }
    }

    tick()

    function onResize() {
      const next = measure(step.anchor)
      setSpot(next)
      setCard(placeCard(next))
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.clearTimeout(timer)
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [step.anchor, stepIndex])

  useEffect(() => {
    if (!step.anchor) return
    const el = document.querySelector(step.anchor)
    if (!(el instanceof HTMLElement)) return
    el.classList.add('is-tour-target')
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    return () => {
      el.classList.remove('is-tour-target')
    }
  }, [step.anchor, stepIndex])

  return (
    <div className="coach-tour" role="dialog" aria-modal="false" aria-labelledby="coach-tour-title">
      {spot && (
        <div
          className="coach-tour__spot"
          style={{
            top: spot.top - 6,
            left: spot.left - 6,
            width: spot.width + 12,
            height: spot.height + 12,
          }}
          aria-hidden
        />
      )}
      <div
        className={`coach-tour__card coach-tour__card--${card.placement}`}
        style={{ top: card.top, left: card.left, width: CARD_W }}
      >
        <p className="coach-tour__progress">
          {stepIndex + 1} / {TOUR_STEPS.length}
        </p>
        <h2 id="coach-tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="coach-tour__actions">
          <button type="button" className="btn" onClick={onSkip}>
            {t('skip')}
          </button>
          <button type="button" className="btn btn--solid" onClick={onNext}>
            {step.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
