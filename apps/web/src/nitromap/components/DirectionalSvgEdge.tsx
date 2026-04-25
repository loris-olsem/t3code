interface DirectionalSvgEdgeProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className: string;
  arrowClassName: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

export function DirectionalSvgEdge(props: DirectionalSvgEdgeProps) {
  const { arrowClassName, className, id, strokeDasharray, strokeWidth, x1, x2, y1, y2 } = props;
  const arrow = buildArrowHead({ x1, x2, y1, y2 });

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={className}
        strokeDasharray={strokeDasharray}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {arrow ? <polygon key={`${id}:arrow`} points={arrow} className={arrowClassName} /> : null}
    </g>
  );
}

function buildArrowHead(props: { x1: number; y1: number; x2: number; y2: number }): string | null {
  const dx = props.x2 - props.x1;
  const dy = props.y2 - props.y1;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return null;

  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;
  const tipX = props.x1 + dx * 0.62;
  const tipY = props.y1 + dy * 0.62;
  const size = 2.4;
  const width = 1.35;
  const baseX = tipX - unitX * size;
  const baseY = tipY - unitY * size;
  const leftX = baseX + normalX * width;
  const leftY = baseY + normalY * width;
  const rightX = baseX - normalX * width;
  const rightY = baseY - normalY * width;

  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}
