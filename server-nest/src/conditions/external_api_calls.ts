import fetch from 'node-fetch';
import {
  GPSPoint,
  MatchedGPSPoint,
  ValhallaMatchedPoint,
  ValhallaResult,
} from '../entity/Internal_Types';

/**
 * @author Andreas Hansen (s214969) & Jeppe Holm Sørensen(s214961)
 * @output A json object containing the gps coordinates that make up each of the inputted ways
 * @param OSM_Ids A list of OSM way Ids
 */
export async function fetch_OSM_Id_geometry(
  OSM_Ids: number[],
): Promise<GPSPoint[][]> {
  const str: string =
    'data=[out:json];way(id:' + OSM_Ids.join(',') + ');out geom;';
  const result = await fetch('https://overpass-api.de/api/interpreter?' + str, {
    method: 'GET',
  }).then((data: { json: () => any }) => data.json());
  return result.elements.map((r: any) => r.geometry);
}

/**
 * @author Andreas Hansen (s214969) & jeppe Holm Sørensen(s214961)
 * @output A list of information about the OSM ways given as a list
 * @param OSM_Ids a list of OSM way ids
 */
export async function fetch_OSM_Id_Data(OSM_Ids: number[]): Promise<any[]> {
  const str: string =
    'data=[out:json];way(id:' + OSM_Ids.join(',') + ');out geom;';
  const result = await fetch('https://overpass-api.de/api/interpreter?' + str, {
    method: 'GET',
  }).then((data: { json: () => any }) => data.json());
  return result.elements;
}

/**
 * @author Andreas Hansen (s214969)
 * @output A list of OSM way ids
 * @param lat The latitude of a point
 * @param lon The longitude of a point
 * @param name The name of the road
 * @param radius The radius to search for ways within
 */
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

/**
 * @author Andreas Hansen (s214969)
 * @output The result of a call to the overpass-api with the given query
 * @param query the overpass query in json-format
 */
async function fetchOverpass(query: string): Promise<any> {
  const result = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + query,
  }).then((data: { json: () => any }) => data.json());
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
