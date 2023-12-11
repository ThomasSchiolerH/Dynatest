import fetch from 'node-fetch';
import {
  GPSPoint,
  MatchedGPSPoint,
  ValhallaMatchedPoint,
  ValhallaResult,
} from '../entity/Internal_Types';

/**
 * @author Andreas Hansen (s214969)
 * @output A json object containing the gps coordinates that make up each of the inputted ways
 * @param OSM_Ids A list of OSM way Ids
 */
export async function fetch_OSM_Id_geometry(
  OSM_Ids: number[],
): Promise<GPSPoint[][]> {
  console.log(OSM_Ids.join(','));

  const data: string = encodeURIComponent(
    `[out:json];
                 way(id:'${OSM_Ids.join(',')});
                 out id geom;
                 `,
  );
  //[out:json];way(id:95777556, 674640079);out geom;

  //const str: string =
  //'data=[out:json];way(id:' + OSM_Ids.join(',') + ');out geom;';

  const result = await fetchOverpass(data);

  //const result = await fetch('https://overpass-api.de/api/interpreter?' + str, {
  //  method: 'GET',
  //}).then((data: { json: () => any }) => data.json());
  return result.elements.map((r: any) => r.geometry);
}

export async function fetch_OSM_Ids(
  lat: number,
  lon: number,
  name: string,
  radius: number,
): Promise<number[]> {
  const data: string = encodeURIComponent(`
                [out:json]
                [timeout:60];
                way
                (around:${radius},${lat},${lon})
                ["name"="${name}"];
                out body;
        `);
  const result = await fetchOverpass(data);
  return result.map((e) => e.id);
}

async function fetchOverpass(data: string): Promise<any> {
  console.log(data);
  const result = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + data,
  }).then((data: { json: () => any }) => data.json());
  console.log(result);
  return result.elements.map((r: any) => r);
}

/**
 * @author Andreas Hansen (s214969)
 * @param points A list of gps coordinates
 * @output A promise of a list with the same gps coordinates with an OSM Way id attached
 */
export async function map_match(
  points: GPSPoint[],
): Promise<MatchedGPSPoint[]> {
  const body: any = {
    shape: points,
    costing: 'auto',
    shape_match: 'walk_or_snap',
    filters: {
      attributes: [
        'edge.way_id',
        'edge.names',
        'edge.length',
        'matched.edge_index',
      ],
      action: 'include',
    },
  };

  const result: ValhallaResult = await fetch(
    'http://se2-e.compute.dtu.dk:8002/trace_attributes',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  ).then((data: { json: () => any }) => data.json());

  return result.matched_points.reduce(function (
    acc: MatchedGPSPoint[],
    e: ValhallaMatchedPoint,
    i: number,
  ) {
    const p: MatchedGPSPoint = points[i];
    if (e.edge_index > result.edges.length) {
      p.way_id = acc.at(-1).way_id;
      p.names = acc.at(-1).names;
    } else {
      p.way_id = result.edges[e.edge_index].way_id;
      p.names = result.edges[e.edge_index].names;
    }
    acc.push(p);
    return acc;
  }, []);
}
