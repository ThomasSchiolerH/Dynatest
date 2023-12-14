import { interpolate } from './gps_interpolator';
import {
  DynatestTypes,
  GPSPoint,
  MatchedGPSPoint,
  typesetter_string,
  InternalWay,
} from '../entity/Internal_Types';
import { fetch_OSM_Id_geometry, map_match, fetch_OSM_Id_Data } from './external_api_calls';
import { MultiLineString } from 'typeorm';
import { computeSpatialDistance } from './utility';
import {elementAt} from "rxjs";

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

  const OSM_Id_data: any[] = await fetch_OSM_Id_Data([...OSM_Ids]);

  const OSM_Id_geometry: GPSPoint[][] = await fetch_OSM_Id_geometry([...OSM_Ids]);
  //const OSM_Id_geometry: GPSPoint[][] = await fetch_OSM_Id_geometry([95777556, 674640079,]);

 // console.log(OSM_Id_geometry);

  const geometries: MultiLineString[] = OSM_Id_geometry.map((e) =>
    GPSPointsToMultilineString(e),
  );

  //console.log(OSM_Id_geometry, geometries);

  let result: any[] = interpolated.map(function (e) {
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
  result = result.filter((test) => test.type == 'IRI'); //include only IRI data
  // Following section creates the data needed for internal way. This part is uniform for the entire way, except for the geom
  console.log(OSM_Id_data);
  const data = OSM_Id_data.pop();
  let length: number = 0;//length is assmumed to be total length of way
  for(let i = 0; i < data.geometry.length - 1; i++){
    length = length + havresine(
        data.geometry[i].lat,
        data.geometry[i].lon,
        data.geometry[i + 1].lat,
        data.geometry[i + 1].lon);
  }
  length = Math.floor(length * 1000) / 1000;
  let highway = false;
  if(data.tags.highway == true){
    highway = true;
  }
  const way = [data.tags.name, data.id, 0,0, length, ,highway]; //has the info needed for ways, in order, missing geom
  //the following section creates an array of arrays with coverage data. This is unike to each geom.
  //the following section also creates an array with coverage values.
  const coverage: any[] = [];
  const CValue: any[] = [];//coverage value
  let CLength: number = 0;//coverage length so far.
  for(let i = 0;i < result.length; i++){
    CValue.push([result[i].value, result[i].type]);//adds the coverage values.
    const toAdd: any[] = [];
    const coords = result[i].section_geom.coordinates;
    if(i>0){
      CLength = CLength + havresine(
          result[i-1].section_geom.coordinates[0][1][1],
          result[i-1].section_geom.coordinates[0][1][0],
          coords[0][0][1],
          coords[0][0][0]);//length from the last coordinates of the last value to the first of this one
    }
    toAdd.push(Math.round(CLength * 1000) / 1000);//adds d1, rounded to 3 decimals
    CLength = CLength + havresine(
        coords[0][0][1], coords[0][0][0],
        coords[0][1][1], coords[0][1][0]);
    toAdd.push(Math.round(CLength * 1000) / 1000);//adds d2, rounded to 3 decimals
    toAdd.push((coords[0][0][1]+coords[0][1][1])/2);//adds mapped lat, as average
    toAdd.push((coords[0][0][0]+coords[0][1][0])/2);//adds mapped lat, as average
    const timestamp = new Date();
    toAdd.push(timestamp.toString());//adds compute time
    toAdd.push(JSON.stringify(result[i].section_geom));//adds geom
    coverage.push(toAdd);//adds this section to the coverage
  }
  //TODO: seems like theres something wrong with the sorting of Results, which might adversly affect the length measurements if time, fix
  return [way, coverage, CValue];
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

function havresine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): any {
  //haversine function, taken from here: https://www.movable-type.co.uk/scripts/latlong.html#ellipsoid
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
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
