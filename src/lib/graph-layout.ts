export function retainedNodeIds(previous: readonly string[], next: readonly string[]): readonly string[] {
  const laidOut = new Set(previous);
  if (next.every((id) => laidOut.has(id))) return previous;
  return next;
}

export function hiddenNodeIds(retained: readonly string[], visible: readonly string[]): string[] {
  const live = new Set(visible);
  return retained.filter((id) => !live.has(id));
}
