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
      source: e.data_source,
    });
    point_conditions.push({
      distance: Math.round(e.distance02 * 100),
      lat: geom[0][1][1],
      lon: geom[0][1][0],
      type: e.type,
      value: e.value,
      source: e.data_source,
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
      const x: any = {
        distance: e.distance,
        lat: e.lat,
        lon: e.lon,
        source: e.source,
      };
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

  // Order the ways by the longitude of the first point on the way geometry
  resultWays.sort((a, b) =>
    a.geometry.coordinates[0][0][0] > b.geometry.coordinates[0][0][0]
      ? 1
      : b.geometry.coordinates[0][0][0] > a.geometry.coordinates[0][0][0]
      ? -1
      : 0,
  );

  // Compute the road geometry assuming the ways are in correct order
  const coordinates = resultWays.reduce(
    (acc, obj) => acc.concat(obj.geometry.coordinates),
    [],
  );
  const geometry: any = { type: 'MultiLineString', coordinates: coordinates };

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

/**
 * @author Peter Jahola (s233734)
 * @param roadImagesByWayId JSON object structured in an outer object by way ids then by distances inside
 * @output A promise of a list with objects which contains different type of images for the same distance calculated
 * from the beginning of the road
 */
export async function formatRoadImages(roadImagesByWayId) {
  // TODO Order the ways
  // TODO previousWayDistance starts from the relative distance of the beginning of the road
  let previousWayDistance: number = 0;
  const resultImageObject: object[] = [];
  roadImagesByWayId.forEach((roadImagesByDistance: any) => {
    for (const key in roadImagesByDistance.data_by_distance) {
      const distance =
        previousWayDistance +
        Number(roadImagesByDistance.data_by_distance[key].distance);
      const objectForDistance: object = { distance };

      const types = [
        'Image3D',
        'ImageInt',
        'ImageRng',
        'Overlay3D',
        'OverlayInt',
        'OverlayRng',
      ];

      types.forEach((type) => {
        const matchingImage = roadImagesByDistance.data_by_distance[
          key
        ].data.find((image) => image.type === type);

        matchingImage
          ? (objectForDistance[type] = matchingImage.url)
          : (objectForDistance[type] = null);
      });

      resultImageObject.push(objectForDistance);
    }
    previousWayDistance = +Number(
      roadImagesByDistance.data_by_distance[
        roadImagesByDistance.data_by_distance.length - 1
      ].distance,
    );
  });
  return resultImageObject;
}

/**
 * @author Peter Jahola (s233734)
 * @param dataSource ORM instance of the DB
 * @param OSM_Id OSM id of the road
 * @param way_name Name of the road
 * @param node_start Starting node of the way
 * @param node_end Ending node of the way
 * @param length The length of the way in meters
 * @param section_geometry Postgis geomerty of the way
 * @param isHighway Indicator whether the way is a highway
 * @output The generated UUID of the created way in DB
 */
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

/**
 * @author Peter Jahola (s233734)
 * @param dataSource ORM instance of the DB
 * @param distance01 OSM id of the road
 * @param distance02 Name of the road
 * @param computeTime Compute time of the coverage
 * @param latMapped Latitude of the coverage location
 * @param lonMapped Longitude of the coverage location
 * @param section_geometry Postgis geomerty of the way
 * @param wayId Foreign key for the way where the coverage located
 * @output The generated UUID of the created coverage in DB
 */
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

/**
 * @author Peter Jahola (s233734)
 * @param dataSource ORM instance of the DB
 * @param type Coverage value type
 * @param value The value of the coverage
 * @param coverageId Foreign key for the coverage to which the value belongs
 */
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

/**
 * @author Peter Jahola (s233734)
 * @param dataSource ORM instance of the DB
 * @param coordinate Exact location of the image
 * @param imageName Original name of the image
 * @param url URL where the image is reachable
 * @param wayId Foreign key for the way where the image was captured
 * @param type The type of the road image
 * @param distance The distance from the beginning of the way where the image was captured
 */
export async function saveImageDataToDatabase(
  dataSource: DataSource,
  coordinate: object,
  imageName: string,
  url: string,
  wayId: string,
  type: string,
  distance: number,
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
      distance: distance,
    })
    .execute();
}
