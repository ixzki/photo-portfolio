export type ProjectOrderLike = {
  id?: string;
  slug?: string;
  order?: number | string | null;
  createdAt?: string | null;
};

export function hasManualProjectOrder<T extends ProjectOrderLike>(projects: T[]): boolean;
export function sortProjectsForDisplay<T extends ProjectOrderLike>(projects: T[]): T[];
