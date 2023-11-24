const fetch = require('node-fetch');

const GPS = 5280;
const LPE = 5405;
const IRI = 5406;
const RN = 5407;
const RUTTING = 5411;

export function parse_rsp(str: string): any[] {
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

  test();

  return [];

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
