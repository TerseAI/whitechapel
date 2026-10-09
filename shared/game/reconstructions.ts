export type Reconstruction = { id: string; title: string; instruction: string; pairs: [string, string][]; events: { id: string; label: string }[]; order: string[]; failure: string };
export function reconstructionForPair(pair: readonly string[], reconstructions: readonly Reconstruction[]) {
  return reconstructions.find(item => item.pairs.some(candidate => candidate.every(id => pair.includes(id))));
}
export function validReconstruction(reconstruction: Reconstruction, sequence?: readonly string[]) {
  return sequence?.length === reconstruction.order.length && reconstruction.order.every((id, index) => sequence[index] === id);
}

export type ReconstructionView = Omit<Reconstruction, 'order' | 'pairs' | 'failure'>;
export function publicReconstruction({ id, title, instruction, events }: Reconstruction): ReconstructionView { return { id, title, instruction, events }; }
