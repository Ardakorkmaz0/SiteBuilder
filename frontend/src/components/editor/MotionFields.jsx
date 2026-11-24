import { LabeledNumber, LabeledSelect } from './controls.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'

const ENTRANCES = [
  ['none', 'None'],
  ['fade', 'Fade in'],
  ['fade-up', 'Fade up'],
  ['fade-down', 'Fade down'],
  ['slide-right', 'Slide from left'],
  ['slide-left', 'Slide from right'],
  ['zoom', 'Zoom in'],
  ['zoom-out', 'Zoom out'],
  ['flip', 'Flip in'],
  ['rotate', 'Rotate in'],
  ['blur', 'Blur in'],
  ['bounce', 'Bounce up'],
  ['wipe', 'Wipe across'],
]

const SPEEDS = [['fast', 'Fast'], ['normal', 'Normal'], ['slow', 'Slow']]

const HOVERS = [
  ['none', 'None'],
  ['lift', 'Lift'],
  ['grow', 'Grow'],
  ['glow', 'Glow'],
  ['sink', 'Sink'],
  ['tilt', 'Tilt'],
]

// An entrance played when the element scrolls into view, its speed and delay,
// and a hover effect: the same fields for a canvas block (props) and for an
// element of an HTML page (data-anim-in and its classes, utils/htmlMotion.js).
export default function MotionFields({ motion, onChange }) {
  const { t } = useLanguage()
  const animIn = motion?.animIn || 'none'
  return (
    <>
      <LabeledSelect
        label={t('Entrance (on scroll)')}
        value={animIn}
        onChange={(v) => onChange({ animIn: v })}
        options={ENTRANCES.map(([value, label]) => [value, t(label)])}
      />
      {animIn !== 'none' && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledSelect
            label={t('Speed')}
            value={motion?.animSpeed || 'normal'}
            onChange={(v) => onChange({ animSpeed: v })}
            options={SPEEDS.map(([value, label]) => [value, t(label)])}
          />
          {/* Milliseconds: a plain number (the length field put "px" beside it). */}
          <LabeledNumber
            label={t('Delay (ms)')}
            value={motion?.animDelay ?? 0}
            onChange={(v) => onChange({ animDelay: Math.max(0, Math.round(Number(v)) || 0) })}
          />
        </div>
      )}
      <LabeledSelect
        label={t('Hover effect')}
        value={motion?.animHover || 'none'}
        onChange={(v) => onChange({ animHover: v })}
        options={HOVERS.map(([value, label]) => [value, t(label)])}
      />
      <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
        {t('Preview motion by switching to View.')}
      </p>
    </>
  )
}
