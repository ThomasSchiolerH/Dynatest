import {HttpException, Injectable} from '@nestjs/common';
import {InjectDataSource} from '@nestjs/typeorm';
import {DataSource, MultiLineString} from 'typeorm';
import {Coverage_Values} from '../entity/Coverage_Values';
import {Coverage} from '../entity/Coverage';
import {Ways} from '../entity/Ways';
import {Trips} from '../entity/Trips';
import {Condition_Pictures} from "../entity/Condition_Pictures";
import {Picture_ways} from "../entity/Picture_ways";


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

  async getRoadPicturesPath() {
    try {
      const path: Promise<{section_geom: MultiLineString}> = this.dataSource
          .getRepository(Picture_ways)
          .createQueryBuilder('picture_ways')
          .select('ST_AsGeoJSON(picture_way.section_geom) AS section_geom')
          .from('picture_ways', 'picture_way')
          .where("picture_way.name = 'Motorvej syd 70kph'")
          .getRawOne();
      return await path.then(res => res.section_geom);
    } catch (e) {
      console.log(e);
      throw new HttpException("Internal server error", 500);
    }
  }

  // TODO Fix invalid geometry in query and return an image from local folder
  async getPicturesFromLatLon(lat: number, lon: number){
    try{
      const pictureName = this.dataSource
          .getRepository(Condition_Pictures)
          .createQueryBuilder('condition_pictures')
          .select("ST_DISTANCE(" +
              "ST_Transform('ST_POINT(condition_picture.lat_mapped condition_picture.lon_mapped)'::geometry, 3857)," +
              "ST_Transform('ST_Point(lat lon)'::geometry, 3857)) AS distance")
          .from('condition_pictures','condition_picture')
          .where('distance < 3')
          .andWhere('lat = :lat', {lat})
          .andWhere('lon = :lon', {lon})
          .orderBy('distance')
          .getRawOne();
      console.log(await pictureName)

      return{
        //needs to return pictures.
      }
    } catch (e){
      console.log(e);
      throw new HttpException("Internal server error", 500);
    }

  }
}
