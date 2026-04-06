import slugify from 'slugify'
import { nanoid } from 'nanoid'
export function generateEventSlug(title: string): string {
  const base = slugify(title, { lower: true, strict: true })
  const suffix = nanoid(6).toLowerCase()
  return `${base}-${suffix}`
}
