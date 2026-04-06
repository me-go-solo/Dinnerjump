import { redirect } from 'next/navigation'

type Props = { params: Promise<{ slug: string; locale: string }> }

export default async function ManagePage({ params }: Props) {
  const { slug, locale } = await params
  redirect(`/${locale}/organizer/${slug}`)
}
