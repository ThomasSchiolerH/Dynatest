const fetch = require('node-fetch');

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
  //console.log(JSON.stringify(result , null, 2))
  const way_ids = result.elements.map((r: any) => {
    return r.id;
  });
  return way_ids;
}

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

export function computeRoad(points: any[]): any {
  if (points.length == 0) return null;
  const distances: any[] = computeDistances(points);
  const endingPoints: any = computeEndingPoints(distances);
  let to_add: number[] = Array.from(Array(points.length).keys());
  let current: number = endingPoints.start;
  const added: number[] = [current];

  while (to_add.length > 1 && !added.includes(endingPoints.end)) {
    to_add = to_add.filter((e: number): boolean => e !== current);
    current = findNext(to_add, distances, current);
    added.push(current);
  }

  const road: any[] = added.map((value: number) => points[value]);
  let total_distance: number = 0;
  for (let i: number = 1; i < road.length; i++) {
    total_distance += distances[added[i]][added[i - 1]];
    road[i].distance = Math.round(total_distance);
  }

  return { road: road, distance: Math.round(total_distance) };
}