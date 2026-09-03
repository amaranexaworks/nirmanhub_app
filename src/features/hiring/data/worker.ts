import type { Role } from '@models/roles';

export interface Worker {
  id: string;
  name: string;
  trade: Role;
  rating: number;
  ratingCount: number;
  distanceKm: number;
  dayRate: number;
  available: boolean;
  verified: boolean;
  jobsDone: number;
  responseMins: number;
  skills: string[];
}

