import { GPSPointDistance, Measurement } from './Types';

/*
function gps_to_cartesian(p: GPSPoint): CartesianPoint {
  const R: number = 6371; // Earth radius in kilometers

  const lat: number = (p.lat * Math.PI) / 180;
  const lon: number = (p.lon * Math.PI) / 180;

  const x: number = R * Math.cos(lat) * Math.cos(lon);
  const y: number = R * Math.cos(lat) * Math.sin(lon);
  const z: number = R * Math.sin(lat);
  return { x: x, y: y, z: z };
}

function cartesian_to_gps(p: CartesianPoint): GPSPoint {
  let lat: number = Math.atan2(
    p.z,
    Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2)),
  );
  let lon: number = Math.atan2(p.y, p.x);

  lat = (lat * 180) / Math.PI;
  lon = (lon * 180) / Math.PI;

  return { lat: lat, lon: lon };
}

function interpolate_gps(
  p1: GPSPoint,
  p2: GPSPoint,
  distance: number,
): GPSPoint {
  if (p1 == null) return p2;
  else if (p2 == null) return p1;
  else if (p1['interval'] == p2['interval']) return p1;

  const pA: CartesianPoint = gps_to_cartesian(p1);
  const pB: CartesianPoint = gps_to_cartesian(p2);

  const t: number =
    (distance - p1['interval']) / (p2['interval'] - p1['interval']);

  const xC: number = pA.x + t * (pB.x - pA.x);
  const yC: number = pA.y + t * (pB.y - pA.y);
  const zC: number = pA.z + t * (pB.z - pA.z);
  const pC: CartesianPoint = { x: xC, y: yC, z: zC };

  return cartesian_to_gps(pC);
}

 */

function predecessor(
  gps: any[],
  distance: number,
  i: number = 0,
  j: number = gps.length,
): any {
  if (j < i) return null;
  const m: number = Math.floor((i + j) / 2);
  if (gps[m].distance == distance) return gps[m];
  else if (gps[m].distance > distance)
    return predecessor(gps, distance, i, m - 1);
  const t = predecessor(gps, distance, m + 1, j);
  if (t != null) return t;
  else return gps[m];
}

function successor(
  gps: any[],
  distance: number,
  i: number = 0,
  j: number = gps.length,
): any {
  if (j < i) return null;
  const m: number = Math.floor((i + j) / 2);
  if (gps[m].distance == distance) return gps[m];
  else if (gps[m].distance < distance)
    return successor(gps, distance, m + 1, j);
  const t = successor(gps, distance, i, m - 1);
  if (t != null) return t;
  else return gps[m];
}

export function interpolate(m: Measurement, points: GPSPointDistance[]): any {
  const gps_start1 = predecessor(points, m.interval_begin);
  const gps_start2 = successor(points, m.interval_begin);
  const gps_end1 = predecessor(points, m.interval_end);
  const gps_end2 = successor(points, m.interval_end);

  let start: any;
  if (gps_start1 == null) start = gps_start2;
  else if (gps_start2 == null) start = gps_start1;
  else if (
    Math.abs(m.interval_begin - gps_start1.distance) <
    Math.abs(m.interval_begin - gps_start2.distance)
  ) {
    start = gps_start1;
  } else start = gps_start2;

  let end: any;
  if (gps_end1 == null) end = gps_end2;
  else if (gps_end2 == null) end = gps_end1;
  else if (
    Math.abs(m.interval_end - gps_end1.distance) <
    Math.abs(m.interval_end - gps_end2.distance)
  ) {
    end = gps_end1;
  } else end = gps_end2;

  return {
    start: { lat: start.lat, lon: start.lon },
    end: { lat: end.lat, lon: end.lon },
    type: m.line_id,
    value: m.center,
  };
}
