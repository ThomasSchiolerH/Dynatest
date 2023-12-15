// used to access overpass-api
import { HttpException } from '@nestjs/common';
import { Condition_Pictures } from 'src/entity/Condition_Pictures';
import { Coverage } from 'src/entity/Coverage';
import { Coverage_Values } from 'src/entity/Coverage_Values';
import { Ways } from 'src/entity/Ways';
import { DataSource } from 'typeorm';
import { GPSPoint } from '../entity/Internal_Types';

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
export function computeSpatialDistance(p1: GPSPoint, p2: GPSPoint): number {
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

export async function addWayToDatabase(
  dataSource: DataSource,
  OSM_Id: number,
  way_name: string,
  node_start: number,
  node_end: number,
  length: number,
  section_geometry: string,
  isHighway: boolean,
): Promise<string> {
  try {
    const alreadyExistingWay = await dataSource
      .getRepository(Ways)
      .createQueryBuilder('ways')
      .select(['ways.id', 'ways.OSM_Id'])
      .where('ways.OSM_Id = :OsmId', { OsmId: OSM_Id })
      .getRawOne();

    if (alreadyExistingWay) return alreadyExistingWay.ways_id;
    else {
      const returnedValues = await dataSource
        .createQueryBuilder()
        .insert()
        .into(Ways)
        .values({
          OSM_Id: OSM_Id,
          way_name: way_name,
          node_start: node_start,
          node_end: node_end,
          length: length,
          section_geom: () => `ST_GeomFromGeoJSON('${section_geometry}')`,
          IsHighway: isHighway,
        })
        .returning('id')
        .execute();
      return returnedValues.raw[0].id;
    }
  } catch (e) {
    console.log(e);
    throw new HttpException('Internal server error', 500);
  }
}

export async function addCoverageToDatabase(
  dataSource: DataSource,
  distance01: number,
  distance02: number,
  computeTime: string,
  latMapped: number,
  lonMapped: number,
  sectionGeometry: string,
  wayId: string,
): Promise<string> {
  try {
    const alreadyExistingCoverage = await dataSource
      .getRepository(Coverage)
      .createQueryBuilder('coverage')
      .select('coverage.id')
      .where('lat_mapped = :lat', { lat: latMapped })
      .andWhere('lon_mapped = :lon', { lon: lonMapped })
      .getRawOne();

    if (alreadyExistingCoverage) return alreadyExistingCoverage.coverage_id;
    else {
      const returnedValues = await dataSource
        .createQueryBuilder()
        .insert()
        .into(Coverage)
        .values({
          distance01: distance01,
          distance02: distance02,
          compute_time: computeTime,
          lat_mapped: latMapped,
          lon_mapped: lonMapped,
          section_geom: () => `ST_GeomFromGeoJSON('${sectionGeometry}')`,
          way: wayId,
        })
        .returning('id')
        .execute();
      return returnedValues.raw[0].id;
    }
  } catch (e) {
    console.log(e);
    throw new HttpException('Internal server error', 500);
  }
}

export async function addCoverageValueToDatabase(
  dataSource: DataSource,
  type: string,
  value: number,
  coverageId: string,
) {
  try {
    dataSource
      .createQueryBuilder()
      .insert()
      .into(Coverage_Values)
      .values({
        type: type,
        value: value,
        data_source: 'Dynatest',
        coverage: coverageId as any,
      })
      .execute();
  } catch (e) {
    console.log(e);
    throw new HttpException('Internal server error', 500);
  }
}

export async function saveImageDataToDatabase(
    dataSource: DataSource,
    coordinate: object,
    imageName: string,
    url: string,
    wayId: string,
    type: string,
    distance: number
) {
    dataSource
        .createQueryBuilder()
        .insert()
        .into(Condition_Pictures)
        .values({
          lat_mapped: coordinate[1],
          lon_mapped: coordinate[0],
          name: imageName,
          url: url,
          way: wayId,
          type: type,
          distance: distance
        })
        .execute()
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
