export function MetricInline({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'info';
}) {
  return (
    <div className={`metric-inline ${tone ?? ''}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
