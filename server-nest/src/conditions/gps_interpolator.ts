import {
  GPSPoint,
  GPSPointDistance,
  Measurement,
} from '../entity/Internal_Types';

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
  array: any[],
  target: number,
  i: number = 0,
  j: number = array.length - 1,
): any {
  if (j < i) return null;
  const m: number = Math.floor((i + j) / 2);
  if (array[m].distance == target) return array[m];
  else if (array[m].distance > target)
    return predecessor(array, target, i, m - 1);
  const t = predecessor(array, target, m + 1, j);
  if (t != null) return t;
  else return array[m];
}

function successor(
  array: any[],
  target: number,
  i: number = 0,
  j: number = array.length - 1,
): any {
  if (j < i) return null;
  const m: number = Math.floor((i + j) / 2);
  if (array[m].distance == target) return array[m];
  else if (array[m].distance < target)
    return successor(array, target, m + 1, j);
  const t = successor(array, target, i, m - 1);
  if (t != null) return t;
  else return array[m];
}

function interpolate_point(
  distance: number,
  points: GPSPointDistance[],
): GPSPoint {
  const p1 = predecessor(points, distance);
  const p2 = successor(points, distance);

  if (p1 == null) return p2;
  else if (p2 == null) return p1;
  else if (Math.abs(distance - p1.distance) > Math.abs(distance - p2.distance))
    return p2;
  else return p1;
}

export function interpolate(
  measurement: Measurement,
  points: GPSPointDistance[],
): any {
  const start: GPSPoint = interpolate_point(measurement.interval_begin, points);
  const end: GPSPoint = interpolate_point(measurement.interval_end, points);

  return {
    start: { lat: start.lat, lon: start.lon },
    end: { lat: end.lat, lon: end.lon },
    type: measurement.line_id,
    value: measurement.center,
  };
}
