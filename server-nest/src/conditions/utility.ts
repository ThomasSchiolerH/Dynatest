// used to access overpass-api
import fetch from 'node-fetch';

/**
 * @author Andreas Hansen (s214969)
 * @output An object where each item in the input list has been grouped by their value in item.key
 * @param list A list of objects
 * @param key A key each object has
 */
export function groupBy(list: any[], key: any) {
  return list.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

/**
 * @author Andreas Hansen (s214969)
 * @output The distance in meters between the two points
 * @param p1 A point with a .lat and .lon attribute
 * @param p2 A point with a .lat and .lon attribute
 */
export function computeSpatialDistance(p1: any, p2: any): number {
  // degrees to radians.
  const lon1: number = (p1.lon * Math.PI) / 180;
  const lon2: number = (p2.lon * Math.PI) / 180;
  const lat1: number = (p1.lat * Math.PI) / 180;
  const lat2: number = (p2.lat * Math.PI) / 180;

  // Haversine formula
  const dlon: number = lon2 - lon1;
  const dlat: number = lat2 - lat1;
  const a: number =
    Math.pow(Math.sin(dlat / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);

  const c: number = 2 * Math.asin(Math.sqrt(a));

  // Radius of earth in meters
  const r: number = 6371000;

  // calculate the result
  return c * r;
}

/**
 * @author Andreas Hansen (s214969)
 * @param lat Latitude of a GPS-point
 * @param lon Longitude of a GPS-point
 * @param name The name of a road
 * @param radius A number in meters
 * @output A list of OSM way ids with the given road name within the radius of the given point
 */
export async function computeWayIds(
  lat: number,
  lon: number,
  name: string,
  radius: number,
) {
  const result = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body:
      'data=' +
      encodeURIComponent(`
                [out:json]
                [timeout:60];
                way
                (around:${radius},${lat},${lon})
                ["name"="${name}"];
                out body;
        `),
  }).then((data: { json: () => any }) => data.json());
  return result.elements.map((r: any) => {
    return r.id;
  });
}

/**
 * @author Andreas Hansen (s214969)
 * @output The same conditions in a more useful format
 * @param rawWayConditions the conditions straight after a query
 */
export function computeWayConditions(rawWayConditions: any[]): any {
  // Extract the points that make up each condition geometry
  const point_conditions: any[] = [];

  rawWayConditions.forEach((e) => {
    const geom = JSON.parse(e.section_geom).coordinates;
    point_conditions.push({
      distance: Math.round(e.distance01 * 100),
      lat: geom[0][0][1],
      lon: geom[0][0][0],
      type: e.type,
      value: e.value,
    });
    point_conditions.push({
      distance: Math.round(e.distance02 * 100),
      lat: geom[0][1][1],
      lon: geom[0][1][0],
      type: e.type,
      value: e.value,
    });
  });

  // Sort the points by their distance
  point_conditions.sort((a, b) => a.distance - b.distance);

  // Merge points with the same gps into a single point containing all the conditions
  const conditions: any[] = [];
  let current_geom = { lat: 0, lon: 0 };
  let current_distance: number = -1;
  point_conditions.forEach((e) => {
    if (
      (e.lat == current_geom.lat && e.lon == current_geom.lon) ||
      e.distance == current_distance
    ) {
      const last = conditions.at(-1);
      last[e.type] = e.value;
    } else {
      current_distance = e.distance;
      current_geom = { lat: e.lat, lon: e.lon };
      const x: any = { distance: e.distance, lat: e.lat, lon: e.lon };
      x[e.type] = e.value;
      conditions.push(x);
    }
  });

  // Compute multiline geometry string
  const geometry: any = { type: 'MultiLineString', coordinates: [] };
  for (let i: number = 1; i < conditions.length; i++) {
    const p1 = conditions[i - 1];
    const p2 = conditions[i];
    geometry.coordinates.push([
      [p1.lon, p1.lat],
      [p2.lon, p2.lat],
    ]);
  }

  return { conditions: conditions, geometry: geometry };
}

/**
 * @author Andreas Hansen (s214969)
 * @output The same conditions in a more useful format
 * @param rawRoadConditions the conditions straight after querying all the conditions in a list of ways
 */
export async function computeRoadConditions(
  rawRoadConditions: any,
): Promise<any> {
  // Group the conditions by its way id identified by OSM_Id
  const grouped: any[] = Object.values(groupBy(rawRoadConditions, 'OSM_Id'));

  // Compute the way conditions separately for each way with conditions
  const resultWays: any[] = grouped.map((rawWayConditions: any[]) =>
    computeWayConditions(rawWayConditions),
  );

  // Compute the road geometry assuming the ways are in correct order
  const coordinates = resultWays.reduce(
    (acc, obj) => acc.concat(obj.geometry.coordinates),
    [],
  );
  const geometry: any = { type: 'MultiLineString', coordinates: coordinates };

  //TODO: Somehow order the ways

  // Combine the ways that make up the road
  let conditions: any[] = [];
  let distance: number = 0;
  for (let i: number = 0; i < resultWays.length; i++) {
    const way = resultWays[i].conditions.map((e: any) => {
      e.distance = e.distance + distance;
      return e;
    });
    conditions = conditions.concat(way);
    distance += Math.round(grouped[i][0].length);
  }
  return {
    conditions: conditions,
    geometry: geometry,
    distance: distance,
  };
}

/*
function findNext(
  not_added: number[],
  distances: number[][],
  current: number,
): number {
  let next: number = -1;
  let min_dist: number = Infinity;

  for (let i: number = 0; i < distances[current].length; i++) {
    if (not_added.includes(i) && distances[current][i] < min_dist) {
      next = i;
      min_dist = distances[current][i];
    }
  }

  return next;
}

function computeEndingPoints(distances: number[][]): any {
  let max_dist: number = 0;
  let i_max: number = 0;
  let j_max: number = 0;
  for (let i: number = 0; i < distances.length; i++) {
    for (let j: number = 0; j < distances[i].length; j++) {
      if (distances[i][j] > max_dist) {
        max_dist = distances[i][j];
        i_max = i;
        j_max = j;
      }
    }
  }
  return { start: i_max, end: j_max };
}

function computeDistances(points: any[]): any[] {
  const distances: any[] = [];
  for (let i: number = 0; i < points.length; i++) {
    distances.push([]);
    for (let j: number = 0; j < points.length; j++) {
      distances[i].push(computeSpatialDistance(points[i], points[j]));
    }
  }
  return distances;
}
*/
