// A number the editor's px field may have written with its unit ("1200px").
// The field stores what it shows, so whoever reads such a setting as a number
// reads it through here: Number("1200px") is NaN, and the setting quietly did
// nothing. A plain number passes through; anything else is NaN.
export function pxNumber(value) {
  if (typeof value === 'number') return value
  const match = String(value ?? '').trim().match(/^(-?\d*\.?\d+)(px)?$/i)
  return match ? Number(match[1]) : NaN
}
