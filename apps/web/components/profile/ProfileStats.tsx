interface Stat {
  label: string;
  value: number | string;
  icon: string;
}

/** Compact stat-card row for the profile header. */
export function ProfileStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="profile-stats">
      {stats.map((s) => (
        <div key={s.label} className="profile-stat">
          <span className="profile-stat-icon" aria-hidden="true">
            {s.icon}
          </span>
          <strong className="profile-stat-value">{s.value}</strong>
          <span className="profile-stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
