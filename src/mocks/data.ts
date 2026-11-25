import type { Idea, Media, OutputType, Tool, Wish, WishCategory } from '../api/types'

/* ------------------------------------------------------------------------ */
/* Deterministic randomness so the infinite feed is stable between reloads  */
/* ------------------------------------------------------------------------ */

export function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rnd = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/* ------------------------------------------------------------------------ */
/* Media                                                                     */
/* ------------------------------------------------------------------------ */

function unsplash(id: string, w: number, h: number, zoom = 1): string {
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    w: String(w),
    h: String(h),
    q: '70',
  })
  if (zoom > 1) {
    params.set('crop', 'focalpoint')
    params.set('fp-x', '0.5')
    params.set('fp-y', '0.45')
    params.set('fp-z', zoom.toFixed(2))
  }
  return `https://images.unsplash.com/photo-${id}?${params}`
}

const PHOTOS = {
  clothing: [
    '1515886657613-9f3515b0c78f', '1509631179647-0177331693ae', '1496747611176-843222e1e57c',
    '1483985988355-763728e1935b', '1490481651871-ab68de25d43d', '1529139574466-a303027c1d8b',
    '1539109136881-3be0616acf4b', '1485968579580-b6d095142e6e', '1469334031218-e382a71b716b',
    '1487222477894-8943e31ef7b2', '1434389677669-e08b4cac3105', '1525507119028-ed4c629a60a3',
    '1520006403909-838d6b92c22e', '1503342217505-b0a15ec3261c', '1475180098004-ca77a66827be',
    '1524504388940-b1c1722653e1', '1539008835657-9e8e9680c956', '1558769132-cb1aea458c5e',
    '1445205170230-053b83016050',
  ],
  portraits: [
    '1544005313-94ddf0286df2', '1534528741775-53994a69daeb', '1531746020798-e6953c6e8e04',
    '1488426862026-3ee34a7d66df', '1494790108377-be9c29b29330', '1438761681033-6461ffad8d80',
    '1517841905240-472988babdf9', '1529626455594-4ff0802cfb7e',
  ],
  footwear: [
    '1542291026-7eec264c27ff', '1549298916-b41d501d3772', '1595950653106-6c9ebd614d3a',
    '1606107557195-0e29a4b5b4aa', '1608231387042-66d1773070a5', '1600185365483-26d7a4cc7519',
    '1560769629-975ec94e6a86', '1491553895911-0055eca6402d',
  ],
  bags: [
    '1584917865442-de89df76afd3', '1548036328-c9fa89d128fa', '1590874103328-eac38a683ce7',
    '1566150905458-1bf1fc113f0d', '1594223274512-ad4803739b7c',
  ],
  jewelry: [
    '1515562141207-7a88fb7ce338', '1599643478518-a784e5dc4c8f', '1605100804763-247f67b3557e',
    '1611591437281-460bfbe1220a', '1535632066927-ab7c9ab60908', '1573408301185-9146fe634ad0',
  ],
  beauty: [
    '1596462502278-27bfdc403348', '1522335789203-aabd1fc54bc9', '1571781926291-c477ebfd024b',
    '1620916566398-39f1143ab7be', '1556228578-8c89e6adf883', '1598440947619-2c35fc9aa908',
    '1608248543803-ba4f8c70ae0b', '1541643600914-78b084683601', '1592945403244-b3fbafd7f539',
    '1587017539504-67cfbddac569',
  ],
  food: [
    '1567620905732-2d1ec7ab7445', '1565299624946-b28f40a0ae38', '1504674900247-0877df9cc836',
    '1540189549336-e6e99c3679fe', '1555939594-58d7cb561ad1', '1512621776951-a57141f2eefd',
    '1546069901-ba9599a7e63c', '1513104890138-7c749659a591', '1551024601-bec78aea704b',
    '1563805042-7684c019e1cb',
  ],
  electronics: [
    '1505740420928-5e560c06d30e', '1523275335684-37898b6baf30', '1526170375885-4d8ecf77b99f',
    '1546868871-7041f2a55e12', '1572569511254-d8f925fe2cbb', '1486312338219-ce68d2c6f44d',
  ],
  interior: [
    '1618220179428-22790b461013', '1586023492125-27b2c045efd7', '1555041469-a586c61ea9bc',
    '1493663284031-b7e3aefcae8e', '1600210492486-724fe5c67fb0',
  ],
  apparel: [
    '1591047139829-d91aecb6caea', '1576566588028-4147f3842f27', '1556905055-8f358a7a47b2',
    '1551232864-3f0890e580d9', '1523381210434-271e8be1f52b', '1512436991641-6745cdb1723f',
  ],
  misc: [
    '1585386959984-a4155224a1ad', '1618354691373-d851c5c3a990', '1622519407650-3df9883f76a5',
    '1610701596007-11502861dcfa', '1617038220319-276d3cfab638', '1601924994987-69e26d50dc26',
    '1512820790803-83ca734da794', '1517694712202-14dd9538aa97',
  ],
} as const

const VIDEOS: { url: string; posterPhoto: string }[] = [
  {
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    posterPhoto: '1490750967868-88aa4486c946',
  },
  {
    url: 'https://cdn.pixabay.com/video/2024/03/15/204306-923909642_tiny.mp4',
    posterPhoto: '1618220179428-22790b461013',
  },
]

/* ------------------------------------------------------------------------ */
/* Wish categories                                                           */
/* ------------------------------------------------------------------------ */

interface CategorySpec extends WishCategory {
  photos: readonly string[]
  nouns: string[]
  prompt: (style: string) => string
  videoChance?: number
  outputType?: OutputType
}

const CATEGORY_SPECS: CategorySpec[] = [
  {
    id: 'food', label: 'Food', photos: PHOTOS.food, videoChance: 0.12,
    nouns: ['Brunch', 'Still Life', 'Feast', 'Plating', 'Dessert Table', 'Tablescape'],
    prompt: (s) => `Food photography of [your dish] with a ${s} look, styled props, shallow depth of field, appetizing natural light.`,
  },
  {
    id: 'jewelry', label: 'Jewelry', photos: PHOTOS.jewelry,
    nouns: ['Sparkle', 'Macro', 'Velvet Box', 'Hand Model', 'Reflections'],
    prompt: (s) => `Luxury jewelry shot of [your piece], ${s} mood, macro detail, controlled reflections, premium campaign quality.`,
  },
  {
    id: 'bags', label: 'Bags', photos: PHOTOS.bags,
    nouns: ['Carry', 'Studio', 'Pedestal', 'Street Style', 'Levitation'],
    prompt: (s) => `Campaign image of [your bag] in a ${s} setting, sculptural composition, soft shadows, high-end fashion lighting.`,
  },
  {
    id: 'clothing', label: 'Clothing', photos: PHOTOS.clothing,
    nouns: ['Editorial', 'Lookbook', 'Runway', 'Street', 'Portrait', 'Campaign'],
    prompt: (s) => `Fashion editorial of [your model] wearing [your garment], ${s} styling, full-body shot, studio lighting, magazine quality.`,
  },
  {
    id: 'footwear', label: 'Footwear', photos: PHOTOS.footwear,
    nouns: ['Ice Block', 'Float', 'Concrete', 'Splash', 'Pedestal'],
    prompt: (s) => `Hero shot of [your shoe], ${s} concept, dramatic lighting, crisp material detail, advertising composition.`,
  },
  {
    id: 'accessories', label: 'Accessories', photos: [...PHOTOS.electronics.slice(1, 5), ...PHOTOS.bags.slice(0, 2)],
    nouns: ['Detail', 'Flat Lay', 'Wrist Shot', 'Shadow Play'],
    prompt: (s) => `Accessory product photo of [your accessory], ${s} art direction, clean background, sharp focus on texture.`,
  },
  {
    id: 'beauty', label: 'Beauty', photos: [...PHOTOS.beauty, ...PHOTOS.portraits], videoChance: 0.15,
    nouns: ['Glow', 'Skin', 'Ritual', 'Close-up', 'Shelfie', 'Dewy'],
    prompt: (s) => `Beauty close-up of [your model] using [your product], ${s} skin finish, soft diffused light, clean editorial retouch.`,
  },
  {
    id: 'text', label: 'Text', photos: [...PHOTOS.misc, ...PHOTOS.beauty.slice(0, 4)],
    nouns: ['Poster', 'Billboard', 'Headline', 'Sign'],
    prompt: (s) => `Poster design with the text "[YOUR TEXT]", ${s} typography, product [your product] featured, balanced layout.`,
  },
  {
    id: 'logos', label: 'Logos', photos: [...PHOTOS.electronics, ...PHOTOS.misc.slice(0, 3)],
    nouns: ['Emboss', 'Neon Sign', 'Mockup', 'Foil'],
    prompt: (s) => `Brand mockup showing [your logo] as a ${s} 3D treatment on packaging and signage, realistic materials.`,
  },
  {
    id: 'ghost-mannequin', label: 'Ghost Mannequin', photos: PHOTOS.apparel,
    nouns: ['Hollow', 'Invisible Fit', 'Packshot', 'Catalog'],
    prompt: (s) => `Ghost mannequin photo of [your garment], ${s} presentation, hollow-man effect, pure white background, e-commerce ready.`,
  },
  {
    id: 'sports', label: 'Sports', photos: [...PHOTOS.footwear.slice(0, 5), ...PHOTOS.apparel.slice(0, 3)],
    nouns: ['Motion', 'Sprint', 'Court', 'Sweat', 'Freeze'],
    prompt: (s) => `Dynamic sports shot of [your athlete] with [your product], ${s} energy, motion blur, stadium lighting.`,
  },
  {
    id: 'interior', label: 'Interior', photos: PHOTOS.interior, videoChance: 0.18,
    nouns: ['Living Room', 'Loft', 'Nook', 'Suite', 'Gallery'],
    prompt: (s) => `Interior scene featuring [your furniture], ${s} design language, natural window light, architectural digest style.`,
  },
  {
    id: 'electronics', label: 'Electronics', photos: PHOTOS.electronics,
    nouns: ['Tech Hero', 'Exploded View', 'Desk Setup', 'Glow'],
    prompt: (s) => `Tech product render of [your device], ${s} aesthetic, precise reflections, minimal backdrop, launch-keynote quality.`,
  },
]

export const FOR_YOU_ID = 'for-you'

export const CATEGORIES: WishCategory[] = [
  { id: FOR_YOU_ID, label: 'For you' },
  ...CATEGORY_SPECS.map(({ id, label }) => ({ id, label })),
]

const SPEC_BY_ID = new Map(CATEGORY_SPECS.map((c) => [c.id, c]))

export const CATEGORY_SPECS_IDS = CATEGORY_SPECS.map((c) => c.id)

export function isCategory(id: string): boolean {
  return id === FOR_YOU_ID || SPEC_BY_ID.has(id)
}

const STYLES = [
  'Soft', 'Chrome', 'Golden', 'Moody', 'Pastel', 'Neon', 'Editorial', 'Minimal', 'Dreamy',
  'Retro', 'Frosted', 'Velvet', 'Sunlit', 'Noir', 'Candy', 'Glossy', 'Y2K', 'Brutalist',
]

/** Height / width ratios — alternating tall and short cards like the mockup. */
const ASPECTS = [1.75, 1.22, 1.5, 1.3, 1.68, 1.2, 1.42]

const CARD_WIDTH = 480

/** Builds wish #index of a category. Pure and deterministic. */
export function makeWish(categoryId: string, index: number): Wish {
  const spec = SPEC_BY_ID.get(categoryId)!
  const rnd = mulberry32(hashString(`${categoryId}:${index}`))
  const style = STYLES[Math.floor(rnd() * STYLES.length)]
  const noun = spec.nouns[Math.floor(rnd() * spec.nouns.length)]
  const aspect = ASPECTS[(index + Math.floor(rnd() * 2)) % ASPECTS.length]
  const height = Math.round(CARD_WIDTH * aspect)

  const offset = hashString(categoryId) % spec.photos.length
  const cycle = Math.floor(index / spec.photos.length)
  const photo = spec.photos[(index + offset) % spec.photos.length]
  // Repeat cycles zoom into a different crop so repeats don't look identical.
  const zoom = cycle === 0 ? 1 : 1 + ((cycle % 4) + 1) * 0.15

  let media: Media
  if (spec.videoChance && rnd() < spec.videoChance) {
    const v = VIDEOS[index % VIDEOS.length]
    media = {
      type: 'video',
      url: v.url,
      posterUrl: unsplash(v.posterPhoto, CARD_WIDTH, height),
      width: CARD_WIDTH,
      height,
    }
  } else {
    media = {
      type: 'image',
      url: unsplash(photo, CARD_WIDTH, height, zoom),
      posterUrl: unsplash(photo, 24, Math.round(24 * aspect), zoom),
      width: CARD_WIDTH,
      height,
    }
  }

  return {
    id: `${categoryId}~${index}`,
    title: `${style} ${noun}`,
    categoryId,
    media,
    prompt: spec.prompt(style.toLowerCase()),
    outputType: media.type === 'video' ? 'video' : (spec.outputType ?? 'auto'),
  }
}

/** "For you" interleaves all categories with a stable pseudo-random order. */
export function makeForYouWish(index: number): Wish {
  const rnd = mulberry32(hashString(`for-you:${index}`))
  const spec = CATEGORY_SPECS[Math.floor(rnd() * CATEGORY_SPECS.length)]
  return makeWish(spec.id, index)
}

export function wishById(id: string): Wish | null {
  const [categoryId, rawIndex] = id.split('~')
  const index = Number(rawIndex)
  if (!SPEC_BY_ID.has(categoryId) || !Number.isInteger(index) || index < 0) return null
  return makeWish(categoryId, index)
}

export const FEED_LIMITS = {
  pageSize: 20,
  maxPageSize: 50,
  /** Feeds are "infinite" for demo purposes but end eventually. */
  categoryMaxItems: 600,
  forYouMaxItems: 1000,
  searchCorpusPerCategory: 60,
}

/* ------------------------------------------------------------------------ */
/* Ideas & tools                                                             */
/* ------------------------------------------------------------------------ */

const thumb = (id: string) => unsplash(id, 200, 200)

export const IDEAS: Idea[] = [
  {
    id: 'idea-product-profile', title: 'Product Profile', description: 'Create consistent brand content',
    thumbnailUrl: thumb('1505740420928-5e560c06d30e'), outputType: 'image',
    prompt: 'Create a consistent product profile for [your product]: 4 matching shots (front, side, detail, lifestyle) using our brand colors [brand colors] and a clean studio backdrop.',
  },
  {
    id: 'idea-studio-shoot', title: 'Studio Shoot', description: 'Full campaign photoshoot',
    thumbnailUrl: thumb('1584917865442-de89df76afd3'), outputType: 'image',
    prompt: 'Run a full campaign photoshoot for [your product] in a professional studio: hero shot, model shot and close-up, soft key light, [mood] mood.',
  },
  {
    id: 'idea-smart-retouch', title: 'Smart Retouch', description: 'Fix product imperfections',
    thumbnailUrl: thumb('1590874103328-eac38a683ce7'), outputType: 'image',
    prompt: 'Retouch the attached photo of [your product]: remove dust, scratches and creases, even out the colors and keep the original texture realistic.',
  },
  {
    id: 'idea-edit-background', title: 'Edit Background', description: 'Set a new scene',
    thumbnailUrl: thumb('1566150905458-1bf1fc113f0d'), outputType: 'image',
    prompt: 'Replace the background of the attached [your product] photo with [new scene], matching lighting, shadows and perspective.',
  },
  {
    id: 'idea-model-swap', title: 'Model Swap', description: 'Put your product on a model',
    thumbnailUrl: thumb('1529139574466-a303027c1d8b'), outputType: 'image',
    prompt: 'Show [your garment] worn by a [model description] in a [location], natural pose, editorial framing, true-to-life fabric drape.',
  },
  {
    id: 'idea-video-ad', title: 'Video Ad', description: 'Animate into a short spot',
    thumbnailUrl: thumb('1541643600914-78b084683601'), outputType: 'video',
    prompt: 'Create a 10-second vertical video ad for [your product]: slow reveal, macro texture shots, end on the logo with the tagline "[tagline]".',
  },
  {
    id: 'idea-ghost-mannequin', title: 'Ghost Mannequin', description: 'Hollow-man apparel shots',
    thumbnailUrl: thumb('1591047139829-d91aecb6caea'), outputType: 'image',
    prompt: 'Turn the attached flat photo of [your garment] into a ghost mannequin shot with a realistic 3D fit on a pure white background.',
  },
  {
    id: 'idea-flat-lay', title: 'Flat Lay', description: 'Top-down styled compositions',
    thumbnailUrl: thumb('1596462502278-27bfdc403348'), outputType: 'image',
    prompt: 'Top-down flat lay of [your products] arranged on [surface], with complementary props, soft daylight and generous negative space.',
  },
  {
    id: 'idea-lifestyle', title: 'Lifestyle Scene', description: 'Product in real-life context',
    thumbnailUrl: thumb('1618220179428-22790b461013'), outputType: 'image',
    prompt: 'Place [your product] in a realistic lifestyle scene: [scene description], warm natural light, candid feel.',
  },
  {
    id: 'idea-packshot', title: 'Packshot', description: 'Clean e-commerce shots',
    thumbnailUrl: thumb('1542291026-7eec264c27ff'), outputType: 'image',
    prompt: 'Clean e-commerce packshot of [your product] on pure white, centered, soft contact shadow, 2000×2000 marketplace-ready.',
  },
  {
    id: 'idea-food-styling', title: 'Food Styling', description: 'Menu-ready dish photos',
    thumbnailUrl: thumb('1565299624946-b28f40a0ae38'), outputType: 'image',
    prompt: 'Menu photo of [your dish], 45° angle, styled with fresh ingredients, warm restaurant lighting.',
  },
  {
    id: 'idea-jewelry-macro', title: 'Jewelry Macro', description: 'Sparkle-perfect close-ups',
    thumbnailUrl: thumb('1605100804763-247f67b3557e'), outputType: 'image',
    prompt: 'Macro shot of [your jewelry] on [surface], crisp facets, controlled sparkle, luxury campaign look.',
  },
]

export const IDEAS_PER_PAGE = 8

export const TOOLS: Tool[] = [
  {
    id: 'tool-remove-bg', title: 'Remove Background', description: 'Transparent PNG in one click', icon: 'eraser',
    outputType: 'image', prompt: 'Remove the background from the attached image and return a transparent PNG with clean edges.',
  },
  {
    id: 'tool-upscale', title: 'Upscale', description: 'Up to 4× sharper resolution', icon: 'scale',
    outputType: 'image', prompt: 'Upscale the attached image 4× while preserving fine detail and avoiding artifacts.',
  },
  {
    id: 'tool-relight', title: 'Relight', description: 'Change the lighting mood', icon: 'sun',
    outputType: 'image', prompt: 'Relight the attached image with [lighting setup, e.g. golden hour from the left].',
  },
  {
    id: 'tool-ghost', title: 'Ghost Mannequin', description: 'Hollow-man apparel', icon: 'shirt',
    outputType: 'image', prompt: 'Convert the attached garment photo into a ghost mannequin image on white.',
  },
  {
    id: 'tool-animate', title: 'Image to Video', description: 'Bring a still to life', icon: 'film',
    outputType: 'video', prompt: 'Animate the attached image into a 5-second loop with [camera motion, e.g. slow push-in].',
  },
  {
    id: 'tool-recolor', title: 'Recolor', description: 'Try new colorways', icon: 'palette',
    outputType: 'image', prompt: 'Recolor [your product] in the attached image to [new color], keeping materials and shading realistic.',
  },
]
