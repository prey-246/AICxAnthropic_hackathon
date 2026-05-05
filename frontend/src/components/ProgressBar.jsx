export default function ProgressBar({ value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
