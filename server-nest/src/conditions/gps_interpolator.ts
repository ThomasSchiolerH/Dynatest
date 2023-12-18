import {
  GPSPoint,
  GPSPointDistance,
  Measurement,
} from '../entity/Internal_Types';


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
