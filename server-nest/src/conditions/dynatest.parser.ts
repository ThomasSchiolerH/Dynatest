import { interpolate } from './gps_interpolator';
import {
  DynatestTypes,
  GPSPoint,
  MatchedGPSPoint,
  typesetter_string,
  InternalWay,
} from '../entity/Internal_Types';
import { fetch_OSM_Id_geometry, map_match } from './external_api_calls';
import { MultiLineString } from 'typeorm';
import { computeSpatialDistance } from './utility';

export async function parseRSP(str: string): Promise<any[]> {
  const lines: string[] = str.trim().split('\n');
  const items: string[][] = lines.map((line: string): any[] => line.split(','));

  const all_data: any[] = items
    .map((item: string[]) => parse_rsp_item(item))
    .filter((item) => item);

  const gps: any[] = all_data.filter(
    (d): boolean => d.line_id == DynatestTypes.GPS,
  );

  const conditions: any[] = all_data.filter(
    (d): boolean => d.line_id != DynatestTypes.GPS,
  );

  const interpolated: any[] = conditions.map((m) => interpolate(m, gps));

  let points = interpolated.reduce(function (acc, e) {
    acc.push(JSON.stringify(e.start));
    acc.push(JSON.stringify(e.end));
    return acc;
  }, []);

  points = [...new Set(points)].map((e: string) => JSON.parse(e));
  const map_matched_points: MatchedGPSPoint[] = await map_match(points);

  const OSM_Ids: Set<number> = map_matched_points.reduce(
    (acc: Set<number>, x: MatchedGPSPoint) => acc.add(x.way_id),
    new Set<number>(),
  );

  //const OSM_Id_geometry: GPSPoint[] = await fetch_OSM_Id_geometry([...OSM_Ids]);
  const OSM_Id_geometry: GPSPoint[][] = await fetch_OSM_Id_geometry([
    95777556, 674640079,
  ]);

  const geometries: MultiLineString[] = OSM_Id_geometry.map((e) =>
    GPSPointsToMultilineString(e),
  );

  console.log(OSM_Id_geometry, geometries);

  const result: any[] = interpolated.map(function (e) {
    const p: any = { type: typesetter_string(e.type), value: e.value };
    p.way_id = map_matched_points.find(
      (x: MatchedGPSPoint) => x.lat == e.start.lat && x.lon == e.start.lon,
    ).way_id;
    p.section_geom = {
      type: 'MultiLineString',
      coordinates: [
        [
          [e.start.lon, e.start.lat],
          [e.end.lon, e.end.lat],
        ],
      ],
    };

    return p;
  });

  return result;
}

function parse_rsp_item(item: any[]): any {
  item = item.map((i) => {
    if (isNaN(i)) return i;
    else return Number(i);
  });
  switch (parseInt(item[0])) {
    case DynatestTypes.GPS:
      return {
        line_id: item[0],
        distance: item[1],
        status: item[3],
        time: item[4],
        lat: item[5],
        lon: item[6],
      };
    case DynatestTypes.LPE:
    case DynatestTypes.IRI:
    case DynatestTypes.RN:
      return {
        line_id: item[0],
        interval_begin: item[1],
        interval_end: item[2],
        left: item[3],
        center: item[4],
        right: item[5],
      };
    /*
    case DynatestTypes.RUTTING:
      return {
        line_id: item[0],
        interval_begin: item[1],
        interval_end: item[2],
        left: item[3],
        full: item[4],
        right: item[5],
        max_left: item[6],
        max_ful: item[7],
        max_right: item[8],
      };
       */
    default:
      return null;
  }
}

function GPSPointsToMultilineString(points: GPSPoint[]): MultiLineString {
  const coordinatesList: number[][] = points.map((p: GPSPoint) => [
    p.lon,
    p.lat,
  ]);
  const coordinates: number[][][] = [];
  for (let i: number = 0; i < coordinatesList.length - 1; i++) {
    coordinates.push([coordinatesList[i], coordinatesList[i + 1]]);
  }

  return {
    type: 'MultiLineString',
    coordinates: coordinates,
  };
}

function OSMIdToWay(OSM_Id: number): InternalWay {
  return {
    way_name: null,
    OSM_Id: OSM_Id,
    node_start: null,
    node_end: 1,
    length: 1,
    section_geom: null,
    is_highway: true,
  };
}
