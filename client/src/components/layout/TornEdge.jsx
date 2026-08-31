/* Jagged section divider — the torn-paper edge from the official Deadlock site.
   Deterministic points so it never shifts between renders. */
export default function TornEdge({ fill = '#1d1a16', flip = false, className = '' }) {
  const d = 'M0,12 L0,7 L40,10 L85,4 L130,9 L175,3 L225,8 L280,2 L330,7 L385,4 L440,9 L495,3 L540,8 L600,2 L655,7 L710,3 L760,9 L820,4 L875,8 L930,2 L985,7 L1040,4 L1095,9 L1150,3 L1200,7 L1200,12 Z';
  return (
    <svg viewBox="0 0 1200 12" preserveAspectRatio="none" aria-hidden="true"
      className={`block w-full h-3 ${flip ? 'rotate-180' : ''} ${className}`}>
      <path d={d} fill={fill} />
    </svg>
  );
}
