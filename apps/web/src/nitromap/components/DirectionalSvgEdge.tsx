interface DirectionalSvgEdgeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className: string;
  arrowClassName: string;
  strokeWidth: number;
  sourceGap?: number;
  targetGap?: number;
  strokeDasharray?: string;
}

export function DirectionalSvgEdge(props: DirectionalSvgEdgeProps) {
  const {
    arrowClassName,
    className,
    sourceGap = 0,
    strokeDasharray,
    strokeWidth,
    targetGap = 7,
    x1,
    x2,
    y1,
    y2,
  } = props;
  const edge = buildDirectedEdge({ sourceGap, targetGap, x1, x2, y1, y2 });
  if (!edge) return null;

  return (
    <g>
      <line
        x1={edge.startX}
        y1={edge.startY}
        x2={edge.tipX}
        y2={edge.tipY}
        className={className}
        strokeDasharray={strokeDasharray}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <polygon points={edge.arrowPoints} className={arrowClassName} />
    </g>
  );
}

function buildDirectedEdge(props: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sourceGap: number;
  targetGap: number;
}): {
  startX: number;
  startY: number;
  tipX: number;
  tipY: number;
  arrowPoints: string;
} | null {
  const dx = props.x2 - props.x1;
  const dy = props.y2 - props.y1;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return null;

  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;

  const usableSourceGap = Math.min(props.sourceGap, length / 3);
  const usableTargetGap = Math.min(props.targetGap, length / 3);
  const startX = props.x1 + unitX * usableSourceGap;
  const startY = props.y1 + unitY * usableSourceGap;
  const tipX = props.x2 - unitX * usableTargetGap;
  const tipY = props.y2 - unitY * usableTargetGap;
  const size = 1.7;
  const width = 0.9;
  const baseX = tipX - unitX * size;
  const baseY = tipY - unitY * size;
  const leftX = baseX + normalX * width;
  const leftY = baseY + normalY * width;
  const rightX = baseX - normalX * width;
  const rightY = baseY - normalY * width;

  return {
    startX,
    startY,
    tipX,
    tipY,
    arrowPoints: `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`,
  };
}
