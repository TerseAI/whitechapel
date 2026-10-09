export type SiteId = string;
export type MapSource = { title: string; url: string };
export type GeographicSite = { id: string; name: string; kind: 'historical' | 'fictional'; address: string; precision: 'site' | 'street' | 'fictional'; point: [number, number] | null; note: string; sources: MapSource[]; placement: string; reviewed: string };
export type DistrictAtlas = { src: string; width: number; height: number; title: string; description: string; source: MapSource; sha256?: string; kind: 'historical' | 'fictional' };
