import type { DonationGoal as Goal } from "@/lib/donation-goal";

/** Ko-fi-style monthly funding goal widget (label + progress bar + blurb). */
export function DonationGoal({ goal }: { goal: Goal }) {
  return (
    <div className="donate-goal">
      <h3 className="donate-goal-title">{goal.label}</h3>
      <div
        className="donate-goal-bar"
        role="progressbar"
        aria-valuenow={goal.pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${goal.pct}%` }} />
      </div>
      <p className="donate-goal-pct">
        <strong>{goal.pct}%</strong> da meta
      </p>
      <p className="donate-goal-desc">{goal.description}</p>
    </div>
  );
}
