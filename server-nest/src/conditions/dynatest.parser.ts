const fetch = require('node-fetch');

const GPS = 5280;
const LPE = 5405;
const IRI = 5406;
const RN = 5407;
const RUTTING = 5411;

export function parse_rsp(str: string): any[] {
  function prev_gps(
    distance: number,
    i: number = 0,
    j: number = gps.length,
  ): any {
    if (j < i) return null;
    const m: number = Math.floor((i + j) / 2);
    if (gps[m].interval == distance) return gps[m];
    else if (gps[m].interval > distance) return prev_gps(distance, i, m - 1);
    const t = prev_gps(distance, m + 1, j);
    if (t != null && t != undefined) return t;
    else return gps[m];
  }

  function next_gps(
    distance: number,
    i: number = 0,
    j: number = gps.length,
  ): any {
    if (j < i) return null;
    const m: number = Math.floor((i + j) / 2);
    if (gps[m].interval == distance) return gps[m];
    else if (gps[m].interval < distance) return next_gps(distance, m + 1, j);
    const t = next_gps(distance, i, m - 1);
    if (t != null && t != undefined) return t;
    else return gps[m];
  }

  async function test() {
    const result = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body:
        'data=' +
        encodeURIComponent(`
                [out:json]
                [timeout:60];
                way
                (around:1000,55.67821,12.55512)
                ["name"="Danasvej"];
                out body;
        `),
    }).then((data: { json: () => any }) => data.json());

    console.log(JSON.stringify(result, null, 2));
  }

  //test();
  //return [];

  const lines = str.trim().split('\n');
  const items = lines.map((line: string): any[] => line.split(','));

  const ds: any[] = items
    .map((item: string[]) => parse_rsp_line(item))
    .filter((element) => {
      return element;
    });

  const gps: any[] = ds.filter((d): boolean => d.line_id == GPS);

  const measurements: any[] = ds.filter((d): boolean => d.line_id != GPS);

  measurements.forEach((m): void => {
    m['begin_prev_gps'] = prev_gps(m.interval_begin);
    m['begin_next_gps'] = next_gps(m.interval_begin);
    m['end_prev_gps'] = prev_gps(m.interval_end);
    m['end_next_gps'] = next_gps(m.interval_end);

    let t_begin: number = 0;
    if (m['begin_prev_gps'] != null && m['begin_next_gps'] != null) {
      t_begin =
        (m.interval_begin - m['begin_prev_gps'].interval) /
        (m['begin_next_gps'].interval - m['begin_prev_gps'].interval);
      console.log(t_begin);
    }

    let t_end: number = 0;
    if (m['end_prev_gps'] != null && m['end_prev_gps'] != null) {
      t_end =
        (m.interval_end - m['end_prev_gps'].interval) /
        (m['end_next_gps'].interval - m['end_prev_gps'].interval);
    }

    m['t_begin'] = t_begin;
    m['t_end'] = t_end;
  });

  const res = measurements.slice(0, 5);

  console.log(res);

  return res;
}

function parse_rsp_line(item: any[]): any {
  item = item.map((i) => {
    if (isNaN(i)) return i;
    else return Number(i);
  });
  switch (parseInt(item[0])) {
    case GPS:
      return {
        line_id: item[0],
        interval: item[1],
        status: item[3],
        time: item[4],
        lat: item[5],
        lon: item[6],
      };
    case LPE:
    case IRI:
    case RN:
      return {
        line_id: item[0],
        interval_begin: item[1],
        interval_end: item[2],
        left: item[3],
        center: item[4],
        right: item[5],
      };
    case RUTTING:
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

export function parse_rsp_Pictures(str: string): any[] {
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

    return [GeoMultilineString(multiString)];
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

  function GeoMultilineString(coords: any[]): {
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

  return pictureLocationList();
}
