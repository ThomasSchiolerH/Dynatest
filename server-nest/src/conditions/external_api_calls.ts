import fetch from 'node-fetch';
import {
  GPSPoint,
  MatchedGPSPoint,
  ValhallaMatchedPoint,
  ValhallaResult,
} from './Types';

/**
 * @author Andreas Hansen (s214969)
 * @param lat Latitude of a GPS-point
 * @param lon Longitude of a GPS-point
 * @param name The name of a road
 * @param radius A number in meters
 * @output A list of OSM way ids with the given road name within the radius of the given point
 */
export async function fetch_OSM_Ids(
  lat: number,
  lon: number,
  name: string,
  radius: number,
): Promise<number[]> {
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
