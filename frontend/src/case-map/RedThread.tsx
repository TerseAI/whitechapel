import { BaseEdge, type ConnectionLineComponentProps, type EdgeProps } from '@xyflow/react';

export function RedThread({ id, sourceX, sourceY, targetX, targetY }: EdgeProps) {
  const path = threadPath(sourceX, sourceY + 14, targetX, targetY + 14);
  return <>
    <path className="thread-shadow" d={path}/>
    <BaseEdge id={id} path={path} className="red-thread" interactionWidth={18}/>
    <path className="thread-fibre" d={path}/>
  </>;
}

export function DrawingThread({ fromNode, toNode, toX, toY }: ConnectionLineComponentProps) {
  const x = fromNode.internals.positionAbsolute.x + (fromNode.measured.width ?? 0) / 2;
  const y = fromNode.internals.positionAbsolute.y + 14;
  const endX = toNode ? toNode.internals.positionAbsolute.x + (toNode.measured.width ?? 0) / 2 : toX;
  const endY = toNode ? toNode.internals.positionAbsolute.y + 14 : toY;
  return <path className="drawing-thread" d={threadPath(x, y, endX, endY)}/>;
}

function threadPath(x1: number, y1: number, x2: number, y2: number) {
  const sag = Math.min(18, Math.hypot(x2 - x1, y2 - y1) * .035);
  return `M ${x1},${y1} Q ${(x1 + x2) / 2},${(y1 + y2) / 2 + sag} ${x2},${y2}`;
}
