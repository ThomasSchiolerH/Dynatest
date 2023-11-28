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

/*
type Result = {
  type: TYPE;
  value: number;
  distance01: number;
  distance02: number;
  OSM_Id: number;
  compute_time: Date;
  section_geom: any;
  trip_id: number;
};

 */
