export interface RouteHighlight {
  id: string;
  distance: number;
}

interface RevealStage {
  from: number;
  to: number;
  start: number;
  end: number;
  activeId?: string;
}

/** Give nearby highlights room to be read without changing the recorded geometry. */
export function buildFullRouteSequence(total: number, highlights: RouteHighlight[]): RevealStage[] {
  const stages: { from: number; to: number; weight: number; activeId?: string }[] = [];
  let from = 0;
  let activeId: string | undefined;
  stages.push({ from: 0, to: 0, weight: .08 });
  for (const highlight of [...highlights].sort((a, b) => a.distance - b.distance)) {
    const to = Math.max(from, Math.min(total, highlight.distance));
    if (to > from) stages.push({ from, to, weight: Math.max(.12, Math.sqrt((to - from) / Math.max(1, total))), activeId });
    activeId = highlight.id;
    stages.push({ from: to, to, weight: .18, activeId });
    from = to;
  }
  if (from < total) stages.push({ from, to: total, weight: Math.max(.12, Math.sqrt((total - from) / Math.max(1, total))), activeId });
  stages.push({ from: total, to: total, weight: .2, activeId });
  const weight = stages.reduce((sum, stage) => sum + stage.weight, 0);
  let end = 0;
  return stages.map((stage, index) => {
    const start = end;
    end = index === stages.length - 1 ? 1 : end + stage.weight / weight;
    return { from: stage.from, to: stage.to, activeId: stage.activeId, start, end };
  });
}

export function fullRouteFrame(stages: RevealStage[], progress: number) {
  const value = Math.max(0, Math.min(1, progress));
  const stage = stages.find((entry) => value < entry.end) ?? stages.at(-1);
  if (!stage) return { distance: 0, activeId: undefined };
  const fraction = Math.max(0, Math.min(1, (value - stage.start) / Math.max(Number.EPSILON, stage.end - stage.start)));
  return { distance: stage.from + (stage.to - stage.from) * fraction, activeId: stage.activeId };
}

export function fullRouteScrollProgress(sectionTop: number, sectionHeight: number, viewportHeight: number) {
  return Math.max(0, Math.min(1, -sectionTop / Math.max(1, sectionHeight - viewportHeight)));
}
