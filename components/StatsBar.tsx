interface Props {
  opportunitiesFound: number
  repliesMade: number
  skipped: number
}

export default function StatsBar({ opportunitiesFound, repliesMade, skipped }: Props) {
  const stats = [
    { label: 'Found', value: opportunitiesFound },
    { label: 'Replied', value: repliesMade },
    { label: 'Skipped', value: skipped },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-border bg-card px-4 py-3 text-center"
        >
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}
