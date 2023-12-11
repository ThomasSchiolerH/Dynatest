export type CartesianPoint = {
  x: number;
  y: number;
  z: number;
};

export interface GPSPoint {
  lat: number;
  lon: number;
}

export interface MatchedGPSPoint extends GPSPoint {
  way_id?: number;
  names?: string[];
}

export interface GPSPointDistance extends GPSPoint {
  distance: number;
}

export type Measurement = {
  interval_begin: number;
  interval_end: number;
  line_id: number;
  center: number;
};

export enum DynatestTypes {
  LPE = 5405,
  IRI = 5406,
  RN = 5407,
  RUTTING = 5411,
  GPS = 5280,
}

export function typesetter_string(type: DynatestTypes): string {
  switch (type) {
    case DynatestTypes.GPS:
      return 'GPS';
    case DynatestTypes.IRI:
      return 'IRI';
    case DynatestTypes.LPE:
      return 'LPE';
    case DynatestTypes.RN:
      return 'RN';
    case DynatestTypes.RUTTING:
      return 'RUTTING';
  }
}

type ValhallaEdge = {
  way_id: number;
  names: string[];
};

export type ValhallaMatchedPoint = {
  edge_index: number;
};

export type ValhallaResult = {
  units: string;
  edges: ValhallaEdge[];
  matched_points: ValhallaMatchedPoint[];
  alternative_paths: any[];
};

export type InternalWay = {
  way_name: string;
  OSM_Id: number;
  node_start: number;
  node_end: number;
  length: number;
  section_geom: string;
  is_highway: boolean;
};

type IntervalCoverageValue = {
  value: number;
  type: string;
};

type InternalCoverage = {
  distance01: number;
  distance02: number;
  lat_mapped: number;
  lon_mapped: number;
  compute_time: string;
  section_geom: string;
};

export type DBUpload = {
  way: InternalWay;
  coverage_value: IntervalCoverageValue;
  coverage: InternalCoverage;
};
