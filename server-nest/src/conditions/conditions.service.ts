import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Coverage_Values } from '../entity/Coverage_Values';
import { Coverage } from '../entity/Coverage';
import { Ways } from '../entity/Ways';
import { Trips } from '../entity/Trips';
import {Condition_Pictures} from "../entity/Condition_Pictures";


import {parse_rsp } from "./dynatest.parser";
const fetch = require("node-fetch");




@Injectable()
export class ConditionsService {
  constructor(
    @InjectDataSource('lira-map')
    private dataSource: DataSource,
  ) {}

  async getConditions(
    minLat: string,
    maxLat: string,
    minLng: string,
    maxLng: string,
    type: string,
    valid_before: string,
    valid_after: string,
    computed_after: string,
  ) {
    let res;
    try {
      const conditions = this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select([
          'coverage_value.id AS id',
          'type',
          'value',
          'std',
          'start_time_utc',
          'compute_time',
          'task_id',
          'ST_AsGeoJSON(coverage.section_geom) AS section_geom',
          'way."IsHighway" AS IsHighway',
          'way."OSM_Id"',
        ])
        .innerJoin(
          Coverage,
          'coverage',
          'coverage_value.fk_coverage_id = coverage.id',
        )
        .innerJoin(Trips, 'trip', 'coverage.fk_trip_id = trip.id')
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .where('coverage_value.ignore IS NULL');
      if (type !== undefined) {
        conditions.andWhere('type = :type', { type });
      }

      const minLatNo = Number(minLat);
      const maxLatNo = Number(maxLat);
      const minLngNo = Number(minLng);
      const maxLngNo = Number(maxLng);
      if (
        !isNaN(minLatNo) &&
        !isNaN(maxLatNo) &&
        !isNaN(minLngNo) &&
        !isNaN(maxLngNo)
      ) {
        conditions.andWhere(
          'ST_Intersects(ST_MakeEnvelope(minLngNo,minLatNo, maxLngNo,maxLatNo), section_geom',
        );
      }

      if (valid_after !== undefined) {
        conditions.andWhere('start_time_utc >= :valid_after', { valid_after });
      }

      if (valid_before !== undefined) {
        conditions.andWhere('start_time_utc <= :valid_before', {
          valid_before,
        });
      }

      if (computed_after !== undefined) {
        conditions.andWhere('compute_time > :computed_after', {
          computed_after,
        });
      }

      res = await conditions.getRawMany();
    } catch (e) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    return {
      type: 'FeatureCollection',
      features: res.map((r: any) => {
        return {
          type: 'Feature',
          geometry: JSON.parse(r.section_geom),
          properties: {
            id: r.id,
            type: r.type,
            value: r.value,
            std: r.std,
            valid_time: r.start_time_utc,
            motorway: r.IsHighway,
            compute_time: r.compute_time,
            task_id: r.task_id,
            osm_id: r.OSM_Id,
          },
        };
      }),
    };
  }

  async getClicked(coverage_value_id: string) {
    const conditions = this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select([
          'way_name',
          'trip."id" as trip_id',
          'coverage."id" as coverage_id',
          'lenght AS length',
          'ST_AsGeoJSON(coverage.section_geom, 5, 0) AS section_geom',
          'way."IsHighway" AS is_highway',
          'way."OSM_Id" AS OSM_Id',
        ])
        .innerJoin(Coverage,'coverage','coverage_value.fk_coverage_id = coverage.id')
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .innerJoin(Trips, 'trip', 'coverage.fk_trip_id = trip.id')
        .where('coverage_value.ignore IS NULL')
        .andWhere('coverage_value.id = :coverage_value_id', { coverage_value_id })
    const raw : any = await conditions.getRawOne();
    return raw;
  }

  async getWayConditions(conditions_id: string){

    function computeSpatialDistance(p1: any, p2:any): number{

      // degrees to radians.
      let lon1 : number = p1.lon * Math.PI / 180;
      let lon2 : number = p2.lon * Math.PI / 180;
      let lat1 : number = p1.lat * Math.PI / 180;
      let lat2 : number = p2.lat * Math.PI / 180;

      // Haversine formula
      let dlon : number = lon2 - lon1;
      let dlat : number = lat2 - lat1;
      let a : number = Math.pow(Math.sin(dlat / 2), 2)
          + Math.cos(lat1) * Math.cos(lat2)
          * Math.pow(Math.sin(dlon / 2),2);

      let c : number = 2 * Math.asin(Math.sqrt(a));

      // Radius of earth in meters
      let r : number = 6371000;

      // calculate the result
      return(c * r);
    }

    try{
      const clicked = await this.getClicked(conditions_id);
      const osm_id = clicked.osm_id;

      const way : any = await this.dataSource
          .getRepository(Ways)
          .createQueryBuilder('way')
          .select([
            'id',
            'way."OSM_Id"',
            'way_name',
            'node_start',
            'node_end',
            'lenght as length',
            'ST_AsGeoJSON(section_geom, 5, 0) AS way_geom',
            'way."IsHighway"'])
          .where('way."OSM_Id" = :osm_id', {osm_id}).getRawOne();

      const conditions : any[] = await this.dataSource
          .getRepository(Coverage_Values)
          .createQueryBuilder('coverage_value')
          .select([
            'type',
            'value',
            'ST_AsGeoJSON(coverage.section_geom, 5, 0) AS section_geom'])
          .innerJoin(Coverage, 'coverage', 'coverage_value.fk_coverage_id = coverage.id')
          .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
          .where('coverage_value.ignore IS NULL')
          .andWhere('way."OSM_Id" = :osm_id', {osm_id}).getRawMany();

      let way_coordinates = JSON.parse(way.way_geom).coordinates.map((p:any[]): any =>{ return {lat: p[1], lon: p[0]} });
      let current = way_coordinates.pop();

      let points_order : any[] = [{lat: current.lat, lon: current.lon}];

      const points_set : Set<any> = new Set();

      way_coordinates.forEach((wc:any) => points_set.add(JSON.stringify({lat:wc.lat,lon:wc.lon})));

      conditions.forEach((c): void =>{
        const geom = JSON.parse(c.section_geom).coordinates;
        c["start"] = {lat: geom[0][0][1], lon: geom[0][0][0] };
        c["end"] = {lat: geom[0][1][1], lon: geom[0][1][0] };
        points_set.add(JSON.stringify(c.start));
        points_set.add(JSON.stringify(c.end));
      });

      const points_list : any[] = Array.from(points_set).map((x:string) => JSON.parse(x));

      let total_distance = 0;

      while(points_list.length > 0){

        let index = 0;
        let min_distance = Infinity;
        let distance = 0;

        for(let i: number = 0; i < points_list.length; i++){
          distance = computeSpatialDistance(current,points_list[i]);
          if(distance < min_distance){

            index = i;
            min_distance = distance;
          }
        }
        current = points_list[index];
        current.distance = Math.round(total_distance);
        total_distance += min_distance;
        points_order.push(points_list[index]);
        points_list.splice(index,1);
      }

      const geom : any = {"type":"MultiLineString","coordinates":[]};
      for(let i : number = 1; i < points_order.length; i++){
        let p1 = points_order[i-1];
        let p2 = points_order[i]
        geom.coordinates.push([[p1.lon,p1.lat],[p2.lon,p2.lat]]);
      }

      conditions.forEach((c: any): void =>{
        points_order.forEach((p:any):void =>{
          if((p.lat == c.start.lat && p.lon == c.start.lon) || (p.lat == c.end.lat && p.lon == c.end.lon)){
            p[c.type] = c.value;
          };
        });
      });

      return {success: true, way_id: way.OSM_Id, geom: geom, road_name: clicked.way_name, way_distance: Math.round(total_distance), conditions: points_order};
    }
    catch (e){
      return {success: false, message: e.message};
    }
  }


  async getWayConditions2(way_id: string){

    function computeSpatialDistance(p1: any, p2:any): number{

      // degrees to radians.
      let lon1 : number = p1.lon * Math.PI / 180;
      let lon2 : number = p2.lon * Math.PI / 180;
      let lat1 : number = p1.lat * Math.PI / 180;
      let lat2 : number = p2.lat * Math.PI / 180;

      // Haversine formula
      let dlon : number = lon2 - lon1;
      let dlat : number = lat2 - lat1;
      let a : number = Math.pow(Math.sin(dlat / 2), 2)
          + Math.cos(lat1) * Math.cos(lat2)
          * Math.pow(Math.sin(dlon / 2),2);

      let c : number = 2 * Math.asin(Math.sqrt(a));

      // Radius of earth in meters
      let r : number = 6371000;

      // calculate the result
      return(c * r);
    }

    try{
      const way : any = await this.dataSource
          .getRepository(Ways)
          .createQueryBuilder('way')
          .select([
            'id',
            'way."OSM_Id"',
            'way_name',
            'node_start',
            'node_end',
            'lenght as length',
            'ST_AsGeoJSON(section_geom, 5, 0) AS way_geom',
            'way."IsHighway"'])
          .where('way."OSM_Id" = :way_id', {way_id}).getRawOne();

      const conditions : any[] = await this.dataSource
          .getRepository(Coverage_Values)
          .createQueryBuilder('coverage_value')
          .select([
            'type',
            'value',
            'ST_AsGeoJSON(coverage.section_geom, 5, 0) AS section_geom'])
          .innerJoin(Coverage, 'coverage', 'coverage_value.fk_coverage_id = coverage.id')
          .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
          .where('coverage_value.ignore IS NULL')
          .andWhere('way."OSM_Id" = :way_id', {way_id}).getRawMany();

      let way_coordinates = JSON.parse(way.way_geom).coordinates.map((p:any[]): any =>{ return {lat: p[1], lon: p[0]} });
      let current = way_coordinates.pop();

      let points_order : any[] = [{lat: current.lat, lon: current.lon}];

      const points_set : Set<any> = new Set();

      way_coordinates.forEach((wc:any) => points_set.add(JSON.stringify({lat:wc.lat,lon:wc.lon})));

      conditions.forEach((c): void =>{
        const geom = JSON.parse(c.section_geom).coordinates;
        c["start"] = {lat: geom[0][0][1], lon: geom[0][0][0] };
        c["end"] = {lat: geom[0][1][1], lon: geom[0][1][0] };
        points_set.add(JSON.stringify(c.start));
        points_set.add(JSON.stringify(c.end));
      });

      const points_list : any[] = Array.from(points_set).map((x:string) => JSON.parse(x));

      let total_distance = 0;

      while(points_list.length > 0){

        let index = 0;
        let min_distance = Infinity;
        let distance = 0;

        for(let i: number = 0; i < points_list.length; i++){
          distance = computeSpatialDistance(current,points_list[i]);
          if(distance < min_distance){

            index = i;
            min_distance = distance;
          }
        }
        current = points_list[index];
        current.distance = Math.round(total_distance);
        total_distance += min_distance;
        points_order.push(points_list[index]);
        points_list.splice(index,1);
      }

      const geom : any = {"type":"MultiLineString","coordinates":[]};
      for(let i : number = 1; i < points_order.length; i++){
        let p1 = points_order[i-1];
        let p2 = points_order[i]
        geom.coordinates.push([[p1.lon,p1.lat],[p2.lon,p2.lat]]);
      }

      conditions.forEach((c: any): void =>{
        points_order.forEach((p:any):void =>{
          if((p.lat == c.start.lat && p.lon == c.start.lon) || (p.lat == c.end.lat && p.lon == c.end.lon)){
            p[c.type] = c.value;
          };
        });
      });

      return {success: true, way_id: way.OSM_Id, geom: geom, way_distance: Math.round(total_distance), conditions: points_order};
    }
    catch (e){
      return {success: false, way_id: way_id, message: e.message};
    }
  }

  async getRoadConditions(conditions_id: string) {


    async function computeWayIds(lat: number, lon: number, name: string, radius : number){

      var result = await fetch(
          "https://overpass-api.de/api/interpreter",
          {
            method: "POST",
            body: "data="+ encodeURIComponent(`
                [out:json]
                [timeout:60];
                way
                (around:${radius},${lat},${lon})
                ["name"="${name}"];
                out body;
        `)
          },
      ).then(
          (data: { json: () => any; })=>data.json()
      )
      //console.log(JSON.stringify(result , null, 2))
      const way_ids = result.elements.map((r:any) => {return r.id});
      return way_ids;
    }

    function computeRoad(points: any[]) : any{
      if(points.length == 0) return null;
      let distances : any[] = computeDistances(points);
      let endingPoints : any = computeEndingPoints(distances);
      let to_add : number[] = Array.from(Array(points.length).keys());
      let current : number = endingPoints.start;
      let added : number[] = [current];

      while(to_add.length > 1 && !added.includes(endingPoints.end)){
        to_add = to_add.filter((e : number) : boolean => e !== current);
        current = findNext(to_add,distances, current);
        added.push(current);
      }

      let road : any[] = added.map((value: number) => points[value]);
      let total_distance : number = 0;
      for(let i : number = 1; i < road.length; i++){
        total_distance += distances[added[i]][added[i-1]];
        road[i].distance = Math.round(total_distance);
      }

      return {road:road,distance:Math.round(total_distance)};
    }

    function findNext(not_added : number[],distances: number[][], current: number): number{
      let next : number = -1;
      let min_dist : number = Infinity;

      for(let i : number = 0; i < distances[current].length; i++){
        if(not_added.includes(i) && distances[current][i] < min_dist){
          next = i;
          min_dist = distances[current][i];
        }
      }

      return next;
    }

    function computeEndingPoints(distances: number[][]): any{
      let max_dist: number = 0;
      let i_max : number = 0;
      let j_max : number = 0;
      for(let i : number = 0; i < distances.length; i++){
        for(let j: number = 0; j < distances[i].length; j++){
          if(distances[i][j] > max_dist){
            max_dist = distances[i][j];
            i_max = i;
            j_max = j;
          }
        }
      }
      return {start: i_max, end: j_max};
    }

    function computeDistances(points: any[]): any[]{
      let distances : any[] = [];
      for(let i : number = 0; i < points.length; i++){
        distances.push([]);
        for(let j : number = 0; j < points.length; j++){
          distances[i].push(computeSpatialDistance(points[i],points[j]));
        }
      }
      return distances;
    }

    function computeSpatialDistance(p1: any, p2:any): number{

      // degrees to radians.
      let lon1 : number = p1.lon * Math.PI / 180;
      let lon2 : number = p2.lon * Math.PI / 180;
      let lat1 : number = p1.lat * Math.PI / 180;
      let lat2 : number = p2.lat * Math.PI / 180;

      // Haversine formula
      let dlon : number = lon2 - lon1;
      let dlat : number = lat2 - lat1;
      let a : number = Math.pow(Math.sin(dlat / 2), 2)
          + Math.cos(lat1) * Math.cos(lat2)
          * Math.pow(Math.sin(dlon / 2),2);

      let c : number = 2 * Math.asin(Math.sqrt(a));

      // Radius of earth in meters
      let r : number = 6371000;

      // calculate the result
      return(c * r);
    }



    const clicked = await this.getClicked(conditions_id);

    console.log(clicked);
    const lon = JSON.parse(clicked.section_geom).coordinates[0][0][0];
    const lat = JSON.parse(clicked.section_geom).coordinates[0][0][1];
    const radius = 1000;

    const ids = await computeWayIds(lat,lon,clicked.way_name,radius);

    const road : any[] =  await Promise.all( ids.map(async (id: string) => await this.getWayConditions2(id)));

    console.log(road);

    return road;



    let raw: any[];
    let road_points_set : any = new Set();
    let road_points : any[] = [];
    let condition_types : any = new Set();

    try {
      const clicked: any = await this.getClicked(conditions_id);
      const way_name = clicked.way_name;

      const conditions = this.dataSource
          .getRepository(Coverage_Values)
          .createQueryBuilder('coverage_value')
          .select([
            'type',
            'value',
            'ST_AsGeoJSON(coverage.section_geom, 5, 0) AS section_geom',
            'lenght as length',
            'way."IsHighway" AS is_highway',
            'compute_time',
            'way."OSM_Id"',
          ])
          .innerJoin(Coverage, 'coverage', 'coverage_value.fk_coverage_id = coverage.id')
          .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
          .where('coverage_value.ignore IS NULL')
          .andWhere('way.way_name = :way_name', { way_name });

      raw = await conditions.getRawMany();

      raw.forEach((r:any) : void =>{
        condition_types.add(r.type);
        const section_geom = JSON.parse(r.section_geom);
        const start = section_geom.coordinates[0][0];
        const end = section_geom.coordinates[0][1];
        r["start"] = {lat: start[1], lon: start[0], distance:0 };
        r["end"] = {lat: end[1], lon: end[0], distance:0 }

        road_points_set.add(JSON.stringify(r.start));
        road_points_set.add(JSON.stringify(r.end));
      });

      road_points = Array.from(road_points_set).map((x:string) => JSON.parse(x));

      const road_object: any = computeRoad(road_points);

      road_object.road.forEach((r:any):void =>{
        condition_types.forEach((type:string):void =>{
          r[type] = null;
        })
      });

      raw.forEach((stretch: any): void =>{
        road_object.road.forEach((r:any):void =>{
          if((r.lat == stretch.start.lat && r.lon == stretch.start.lon) || (r.lat == stretch.end.lat && r.lon == stretch.end.lon)){
            r[stretch.type] = stretch.value;
          };
        });
      });

      const road_geom : any = {"type":"MultiLineString","coordinates":[]};
      for(let i : number = 1; i < road_object.road.length; i++){
        let p1 = road_object.road[i-1];
        let p2 = road_object.road[i]
        road_geom.coordinates.push([[p1.lon,p1.lat],[p2.lon,p2.lat]]);
      }


      return {
        success: true,
        road_geom: road_geom,
        road_name: clicked.way_name,
        road_distance: road_object.distance,
        road: road_object.road,
      };

    } catch (e) {
      console.log(e);
      return { success: false };
    }
  }

  async post(file: any){
    if(!file.originalname.toLowerCase().endsWith(".rsp")) return {success:false, message:"not a .rsp file"};


    const ds : any[] = parse_rsp(file.buffer.toString());


    return {success:true, message:"file uploaded", data: ds};

  }



  async getPicturesFromLatLon(lat: number, lon: number){
    try{
      const conditions = this.dataSource
          .getRepository(Condition_Pictures)
          .createQueryBuilder('condition_pictures')
          .select('DISTINCT ON(c.id) c.id, c.lat_mapped, c.lon_mapped, c.name')
          .from('condition_pictures','c')
          .where('ST_DISTANCE(ST_Point(c.lon_mapped, c.lat_mapped),geo2, 3)')
          .orderBy('c.id, ST_Distance(ST_Point(c.lon_mapped, c.lat_mapped),ST_Point(lat,lon), 3)')

      return{
        //needs to return pictures.
      }
    } catch (e){

    }

  }
}
