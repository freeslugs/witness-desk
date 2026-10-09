export const VEHICLE_TYPES = ["taxi", "bus", "suv", "truck", "car"] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const CITIES = ["new_york", "san_francisco"] as const;

export type City = (typeof CITIES)[number];

export type ClipMark = "" | "possible_match" | "not_vehicle";

export type Clip = {
  id: string;
  cameraId: string;
  source: string;
  caption: string;
  score: number;
  startSec: number;
  endSec: number;
  mark: ClipMark;
};

export type CaseStatus = "open" | "closed";

export type CaseRecord = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  color: string;
  vehicleType: VehicleType;
  location: City;
  caseDate: string;
  timeLabel?: string;
  stolen: boolean;
  hitAndRun: boolean;
  query: string;
  saved: boolean;
  status?: CaseStatus;
  still?: string;
  clips: Clip[];
};

export function isVehicleType(value: string): value is VehicleType {
  return (VEHICLE_TYPES as readonly string[]).includes(value);
}

export function isCity(value: string): value is City {
  return (CITIES as readonly string[]).includes(value);
}

export type LatestClip = {
  cameraId: string;
  source: string;
  caption: string;
  filename: string;
  uploadedAt: string;
};
