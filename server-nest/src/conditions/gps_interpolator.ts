import {
  GPSPoint,
  GPSPointDistance,
  Measurement,
} from '../entity/Internal_Types';

/**
 * @author Andreas Hansen (s214969)
 * @output Compute the predecessor of some target in the given array by using binary search
 * @param array The array to search in
 * @param target The value to find predecessor for
 * @param i The current lower bound
 * @param j The current upper bound
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

/**
 * @author Andreas Hansen (s214969)
 * @output Compute the successor of some target in the given array by using binary search
 * @param array The array to search in
 * @param target The value to find successor for
 * @param i The current lower bound
 * @param j The current upper bound
 */
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

/**
 * @author Andreas Hansen (s214969)
 * @output Compute gps point closest to the given distance
 *         based on a given distance and a list of gps points
 * @param distance The target distance to interpolate a gps point for
 * @param points A list of known points along with their distance
 */
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

/**
 * @author Andreas Hansen (s214969)
 * @output Interpolate the starting and ending point of a
 *          measurement that only has a start and end distance
 * @param measurement Some measured data along with a starting and ending distance
 * @param points A list of known points along with their distance
 */
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
