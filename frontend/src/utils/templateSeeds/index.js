// Second-wave vertical categories, one file per theme. Each file exports an
// array of category seeds in the same shape as the first wave in
// templateCatalogData.js, plus per-starter hero copy (see templateCopy.starter).
import { DIGITAL_SEEDS } from './digital.js'
import { FOOD_SEEDS } from './food.js'
import { MAKE_SEEDS } from './make.js'
import { MEDIA_SEEDS } from './media.js'
import { PEOPLE_SEEDS } from './people.js'
import { WORK_SEEDS } from './work.js'

export const MORE_VERTICAL_SEEDS = [
  ...FOOD_SEEDS,
  ...WORK_SEEDS,
  ...MAKE_SEEDS,
  ...DIGITAL_SEEDS,
  ...MEDIA_SEEDS,
  ...PEOPLE_SEEDS,
]
