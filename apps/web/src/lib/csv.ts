type DuoRow = {
  person1_name: string
  person2_name: string | null
  person1_email: string
  person2_email: string | null
  status: string
  created_at: string
  hosted_course: string | null
}

export function generateDuoCsv(duos: DuoRow[]): string {
  const headers = 'Duo,E-mail 1,E-mail 2,Status,Aangemeld,Gang'
  const rows = duos.map((d) => {
    const name = d.person2_name
      ? `${d.person1_name} & ${d.person2_name}`
      : d.person1_name
    const date = new Date(d.created_at).toLocaleDateString('nl-NL')
    return [
      name,
      d.person1_email,
      d.person2_email ?? '',
      d.status,
      date,
      d.hosted_course ?? '—',
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  })
  return [headers, ...rows].join('\n')
}
