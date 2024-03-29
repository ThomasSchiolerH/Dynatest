import { interpolate } from './gps_interpolator';
import {
  DynatestTypes,
  GPSPoint,
  MatchedGPSPoint,
  typesetter_string,
  InternalWay,
} from '../entity/Internal_Types';
import {
  fetch_OSM_Id_geometry,
  map_match,
  fetch_OSM_Id_Data,
} from './external_api_calls';
import { MultiLineString, MultiPoint } from 'typeorm';
import { computeSpatialDistance } from './utility';
import { elementAt } from 'rxjs';

/**
 * @author Jeppe Holm Sørensen(s214961) & Andreas Hansen (s214969)
 * @output a list containing three lists: one with way data, one with coverage, and one with coverage valyes
 * @param str: a string containg the RSP file.
 */
export async function parseRSP(str: string): Promise<any[]> {// by jeppe s214961 & andreas hansen s214969
  console.log("test1");
  const lines: string[] = str.trim().split('\n');
  console.log("test2");
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

  const OSM_Id_geometry: GPSPoint[][] = await fetch_OSM_Id_geometry([
    ...OSM_Ids,
  ]);
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
  const data = OSM_Id_data.pop();
  let length: number = 0; //length is assmumed to be total length of way
  for (let i = 0; i < data.geometry.length - 1; i++) {
    length =
      length +
      havresine(
        data.geometry[i].lat,
        data.geometry[i].lon,
        data.geometry[i + 1].lat,
        data.geometry[i + 1].lon,
      );
  }
  length = Math.floor(length * 1000) / 1000;
  let highway = false;
  if (data.tags.highway == true) {
    highway = true;
  }

  const geomHelper: any[] = [];
  for (let i = 0; i < data.geometry.length - 1; i++) {
    geomHelper.push([data.geometry[i].lon, data.geometry[i].lat]);
  }

  const geom: MultiPoint = {
    type: 'MultiPoint',
    coordinates: geomHelper,
  };

  const way = [
    data.tags.name,
    data.id,
    0,
    0,
    length,
    JSON.stringify(geom),
    highway,
  ]; //has the info needed for ways, in order
  //the following section creates an array of arrays with coverage data. This is unike to each geom.
  //the following section also creates an array with coverage values.
  const coverage: any[] = [];
  const CValue: any[] = []; //coverage value
  let CLength: number = 0; //coverage length so far.
  for (let i = 0; i < result.length; i++) {
    CValue.push([result[i].value, result[i].type]); //adds the coverage values.
    const toAdd: any[] = [];
    const coords = result[i].section_geom.coordinates;
    if (i > 0) {
      const lengthHelper =
        Math.floor(
          havresine(
            result[i - 1].section_geom.coordinates[0][1][1],
            result[i - 1].section_geom.coordinates[0][1][0],
            coords[0][0][1],
            coords[0][0][0],
          ) * 100,
        ) / 100000; //length from the last coordinates of the last value to the first of this one. rounded to 2 decimals
      if (lengthHelper < 0.04) {
        CLength = CLength + lengthHelper;
      }
    }
    toAdd.push(CLength); //adds d1
    const CLengthHelper =
      Math.floor(
        havresine(
          coords[0][0][1],
          coords[0][0][0],
          coords[0][1][1],
          coords[0][1][0],
        ) * 100,
      ) / 100000;
    if (CLengthHelper < 0.04) {
      CLength = CLength + CLengthHelper;
    }
    toAdd.push(CLength); //adds d2
    toAdd.push((coords[0][0][1] + coords[0][1][1]) / 2); //adds mapped lat, as average
    toAdd.push((coords[0][0][0] + coords[0][1][0]) / 2); //adds mapped lat, as average
    const time = new Date();
    const timestamp = time.toISOString().slice(0, -1) + '+00';
    toAdd.push(timestamp); //adds compute time
    toAdd.push(JSON.stringify(result[i].section_geom)); //adds geom
    coverage.push(toAdd); //adds this section to the coverage
  }

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

//haversine function, taken from here: https://www.movable-type.co.uk/scripts/latlong.html#ellipsoid
function havresine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): any {

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

function parse_rsp_line(item: any[]): any {
  item = item.map((i) => {
    if (isNaN(i)) return i;
    else return Number(i);
  });
  switch (parseInt(item[0])) {
    case DynatestTypes.GPS:
      return {
        line_id: item[0],
        interval: item[1],
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
    default:
      return null;
  }
}
/**
 * @author Jeppe Holm Sørensen(s214961)
 * @output a list of coordinates, each coordinate corrosping to a picture location
 * @param str: a string containg the RSP file.
 */
export async function parse_rsp_Pictures(str: string): Promise<any[]> {
  //made by Jeppe Sørensen, s214961
  function pictureLocationList() {
    const lines = str.trim().split('\n');

    const items = lines.map((line: string): any[] => line.split(','));

    const ds: any[] = items
      .map((item: string[]) => parse_rsp_line(item))
      .filter((element) => {
        return element;
      });

    const gps: any[] = ds.filter((d): boolean => d.line_id == 5280); //reduce data set to lines with coordinates
    const coordinates: any[] = [];
    for (let i = 0; i < gps.length; i++) {
      //reduce data to coordinates
      coordinates.push([gps[i].lat, gps[i].lon]);
    }
    coordinates.sort();
    coordinates.reverse(); //reverses the array, so we can go through it backwards, as pop is more efficient than shift

    const lengths: number[] = []; //makes array of lengths
    for (let i: number = 0; i < coordinates.length - 1; i++) {
      lengths.push(
        havresine(
          coordinates[i][0],
          coordinates[i][1],
          coordinates[i + 1][0],
          coordinates[i + 1][1],
        ),
      );
    }

    const locations: any[] = [coordinates.pop()]; //adds the first value to the picture locations array
    let lastLocation: any[] = locations[0];
    //return [coordinates.length, lengths.length];
    while (lengths.length > 1) {
      if (lengths[lengths.length - 1] < 2) {
        //add the length to the next one, remoeve from length and coordinate
        //doesn't change last location
        lengths[lengths.length - 2] =
          lengths[lengths.length - 2] + lengths[lengths.length - 1];
        coordinates.pop();
        lengths.pop();
      } else if (lengths[lengths.length - 1] == 2) {
        // add to locations, remove from lengths and coodinates
        lastLocation = coordinates[coordinates.length - 1];
        locations.push(coordinates.pop());
        lengths.pop;
      } else {
        const i = Math.floor(lengths[lengths.length - 1] / 2) + 1;
        const end = coordinates.length - 1;
        let latDis = coordinates[end][0] - lastLocation[0];
        let lonDis = coordinates[end][1] - lastLocation[1];
        latDis = latDis / i;
        lonDis = lonDis / i;
        for (let j = 1; j < i; j++) {
          const toPush = [
            lastLocation[0] + j * latDis,
            lastLocation[1] + j * lonDis,
          ];
          locations.push(toPush);
        }
        coordinates.pop();
        lastLocation = locations[locations.length - 1];
        lengths[lengths.length - 2] =
          lengths[lengths.length - 2] +
          lengths[lengths.length - 1] -
          2 * (i - 1);
        lengths.pop();
      }
    }
    //flip lan and lon, for geojson reasons
    for (let i = 0; i < locations.length; i++) {
      const temp = locations[i][0];
      locations[i][0] = locations[i][1];
      locations[i][1] = temp;
    }

    //turn into multiline string
    const multiString: any[] = [];
    if (locations.length % 2 != 0) {
      locations.push(locations[locations.length - 1]);
    }
    for (let i = 0; i < locations.length; i++) {
      multiString.push([locations[i], locations[i + 1]]);
      i++;
    }

    /*different possible outputs:
    If you return locations, you get a list of coordinates.
    If you return GeoMultilineString(multiString) you get a geojson output, with pairs of coordinates
     */

    return locations;
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
  /*
  //written by Jeppe sørensen s214961
  function GeoMultilineString(coords: any[]): {//function to turn a list of coordinates into a geojson multiline string. Unused in the end
    features: {
      geometry: { coordinates: any[]; type: string };
      type: string;
      properties: NonNullable<unknown>;
    }[];
    type: string;
  } {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiLineString',
            coordinates: coords,
          },
        },
      ],
    };

    return geojson;
  }
*/
  return pictureLocationList();
}
