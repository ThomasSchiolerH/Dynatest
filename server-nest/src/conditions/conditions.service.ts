import {HttpException, Injectable} from '@nestjs/common';
import {InjectDataSource} from '@nestjs/typeorm';
import {DataSource, MultiLineString} from 'typeorm';
import {Coverage_Values} from '../entity/Coverage_Values';
import {Coverage} from '../entity/Coverage';
import {Ways} from '../entity/Ways';
import {Trips} from '../entity/Trips';
import {Condition_Pictures} from "../entity/Condition_Pictures";
import {Picture_ways} from "../entity/Picture_ways";
import { BufferedFile } from 'src/minio-client/file.model';
import { MinioClientService } from 'src/minio-client/minio-client.service';


@Injectable()
export class ConditionsService {
  constructor(
    @InjectDataSource('lira-map')
    private dataSource: DataSource,
    private minioClientService: MinioClientService
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
          },
        };
      }),
    };
  }

  async getRoadNames() {
    try {
      const roadNames =this.dataSource
          .getRepository(Ways)
          .createQueryBuilder('ways')
          .select('way_name')
          .innerJoin(Coverage, 'coverage', 'coverage.fk_way_id = ways.id')
          .distinct(true)
          .orderBy('way_name', 'ASC')
          .getRawMany();
      return await roadNames.then(res => res);
    } catch (e) {
      console.log(e);
      throw new HttpException("Internal server error", 500);
    }
  }

  async getClicked(coverage_value_id: string): Promise<string> {
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
        ])
        .innerJoin(Coverage,'coverage','coverage_value.fk_coverage_id = coverage.id')
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .innerJoin(Trips, 'trip', 'coverage.fk_trip_id = trip.id')
        .where('coverage_value.ignore IS NULL')
        .andWhere('coverage_value.id = :coverage_value_id', { coverage_value_id })
    const raw : any = await conditions.getRawOne();
    return raw;
  }

  async getNearConditionsFromCoverageValueId(coverage_value_id: string) {
    let raw: any[];
    const grouped: any[] = [];
    const n: number = 3;
    let coverage: any = {};
    let types : any = new Set();

    try {
      const clicked: any = await this.getClicked(coverage_value_id);
      const way_name = clicked.way_name;
      const trip_id = clicked.trip_id;

      const conditions = this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select([
          'coverage."id" as coverage_id',
          'type',
          'value',
        ])
        .innerJoin(
          Coverage,
          'coverage',
          'coverage_value.fk_coverage_id = coverage.id',
        )
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .innerJoin(Trips, 'trip', 'coverage.fk_trip_id = trip.id')
        .where('coverage_value.ignore IS NULL')
        .andWhere('way.way_name = :way_name', { way_name })
        .andWhere('trip.id = :trip_id', { trip_id })
        .addOrderBy('coverage.compute_time', 'ASC', 'NULLS FIRST');

      raw = await conditions.getRawMany();

      // grouping by coverage_id
      raw.forEach((r) => {
        types.add(r.type);

        if (grouped.length > 0 && r.coverage_id == grouped.at(-1).coverage_id) {
          grouped.at(-1).coverage[r.type] = r.value;
        } else {
          grouped.push({
            coverage_id: r.coverage_id,
            coverage: {[r.type]: r.value}
          });
        }
      });

      let coverage_id_index: number = grouped.findIndex((r) : boolean => r.coverage_id == clicked.coverage_id);

      types.forEach((type:string) => coverage[type] = []);
      for(let i : number = coverage_id_index - n; i < coverage_id_index + n + 1; i++){
        if(i < 0 || i > grouped.length){
          types.forEach((type: string) => coverage[type].push(null));
        }else{
          types.forEach((type: string): void => {
            coverage[type].push(grouped[i].coverage[type])
          });
        }
      }

      return {
        success: true,
        way_name: clicked.way_name,
        is_highway: clicked.is_highway,
        section_geom: clicked.section_geom,
        coverage: coverage,
      };
    } catch (e) {
      console.log(e);
      return { success: false };
    }
  }

  async getRoadConditions(coverage_value_id: string) {

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

    let raw: any[];
    let road_points_set : any = new Set();
    let road_points : any[] = [];
    let condition_types : any = new Set();

    try {
      const clicked: any = await this.getClicked(coverage_value_id);
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

      road_object.road.forEach((p:any):void =>{

      });

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



  async getRoadPicturesPath() {
    try {
      const path: Promise<{section_geom: MultiLineString}> = this.dataSource
          .getRepository(Picture_ways)
          .createQueryBuilder('picture_ways')
          .select('ST_AsGeoJSON(picture_way.section_geom) AS section_geom')
          .from('picture_ways', 'picture_way')
          .where("picture_way.name = 'Motorvej syd 70kph'")
          .distinct(true)
          .getRawOne();
      return await path.then(res => res.section_geom);
    } catch (e) {
      console.log(e);
      throw new HttpException("Internal server error", 500);
    }
  }

  // TODO Get related pictures from MinIO
  async getPicturesFromLatLon(lat: number, lon: number){
    try{
      const pictureName = this.dataSource
          .getRepository(Condition_Pictures)
          .createQueryBuilder('condition_pictures')
          .select(["ST_DISTANCE(" +
              "ST_Transform(ST_Point(condition_picture.lat_mapped, condition_picture.lon_mapped, 4326), 3857)," +
              "ST_Transform(ST_Point(:lat, :lon, 4326), 3857)) AS distance",
              'condition_picture."name"'
          ])
          .from('condition_pictures','condition_picture')
          .where('ST_DISTANCE(' +
              'ST_Transform(ST_Point(condition_picture.lat_mapped, condition_picture.lon_mapped, 4326), 3857),' +
              'ST_Transform(ST_Point(:lat, :lon, 4326), 3857)) < 3')
          .setParameter('lat', lat)
          .setParameter('lon', lon)
          .orderBy('distance')
          .getRawOne();
      console.log(await pictureName.then(res => res.name))

      return{
        //needs to return pictures.
      }
    } catch (e){
      console.log(e);
      throw new HttpException("Internal server error", 500);
    }

  }

  async uploadZipFile(file: Express.Multer.File) {
    // TODO Extract ZIP file
    // TODO Validate the file structure inside
    // TODO Various processing of different datatypes

    // For now it just says error
    throw new HttpException("Internal server error", 500);

    // TODO Make the image upload with this
    /*let image: BufferedFile;
    this.uploadImage(image).then((res) => {
      this.dataSource
          .createQueryBuilder()
          .insert()
          .into(Condition_Pictures)
          .values({
            lat_mapped: 55.555,   // TODO Get it from RSP file
            lon_mapped: 55.555,   // TODO Get it from RSP file
            name: image.originalname,
            url: res.image_url
          })
          .execute()
    }).catch(e => {
      throw new HttpException("Internal server error", 500);
    })*/
  }

  async uploadImage(image: BufferedFile) {
    const uploaded_image = await this.minioClientService.upload(image);

    return {
      image_url: uploaded_image.url,
      message: 'Image upload successful',
    };
  }
}
