import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Coverage_Values } from '../entity/Coverage_Values';
import { Coverage } from '../entity/Coverage';
import { Ways } from '../entity/Ways';
import { Trips } from '../entity/Trips';
import { Condition_Pictures } from '../entity/Condition_Pictures';

import { parse_rsp } from './dynatest.parser';
import {
  computeRoadConditions,
  computeWayConditions,
  computeWayIds,
} from './utility';

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
      .innerJoin(
        Coverage,
        'coverage',
        'coverage_value.fk_coverage_id = coverage.id',
      )
      .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
      .innerJoin(Trips, 'trip', 'coverage.fk_trip_id = trip.id')
      .where('coverage_value.ignore IS NULL')
      .andWhere('coverage_value.id = :coverage_value_id', {
        coverage_value_id,
      });
    return await conditions.getRawOne();
  }
  async getWayConditions(osm_id: string) {
    try {
      // First query information about the way, such as its name
      // length, geometry and whether it's a highway.
      const clicked_way: any = await this.dataSource
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
          'way."IsHighway"',
        ])
        .where('way."OSM_Id" = :osm_id', { osm_id })
        .getRawOne();

      // Query all conditions that lies on the way
      // This includes all condition types
      const rawWayConditions: any[] = await this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select([
          'type',
          'value',
          'ST_AsGeoJSON(coverage.section_geom, 5, 0) AS section_geom',
          'distance01',
          'distance02',
        ])
        .innerJoin(
          Coverage,
          'coverage',
          'coverage_value.fk_coverage_id = coverage.id',
        )
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .where('coverage_value.ignore IS NULL')
        .andWhere('way."OSM_Id" = :osm_id', { osm_id })
        .getRawMany();

      const result = computeWayConditions(rawWayConditions);

      return {
        success: true,
        name: clicked_way.way_name,
        distance: Math.round(clicked_way.length),
        initial_distance: 0,
        way_geometry: result.geometry,
        conditions: result.conditions,
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async getRoadConditions(osm_id: string) {
    try {
      // Query information about the way, such as its name
      // length, geometry and whether it's a highway.
      const clicked_way: any = await this.dataSource
        .getRepository(Ways)
        .createQueryBuilder('way')
        .select([
          'id',
          'way."OSM_Id"',
          'way_name',
          'node_start',
          'node_end',
          'lenght as length',
          'ST_AsGeoJSON(section_geom, 5, 0) AS geometry',
          'way."IsHighway"',
        ])
        .where('way."OSM_Id" = :osm_id', { osm_id })
        .getRawOne();

      // Extract the first GPS-point from the way
      const geometry = JSON.parse(clicked_way.geometry);
      const lon = geometry.coordinates[0][0];
      const lat = geometry.coordinates[0][1];
      const radius = 1000; // 1000 meter radius

      // Find all OSM way_ids within a 1000-meter radius around the first GPS-point
      const osm_ids = await computeWayIds(
        lat,
        lon,
        clicked_way.way_name,
        radius,
      );

      // Query all conditions that lies on one of the ways in the list
      // This includes all condition types
      const rawRoadConditions: any[] = await this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select([
          'type',
          'value',
          'way."OSM_Id"',
          'ST_AsGeoJSON(coverage.section_geom, 5, 0) AS section_geom',
          'lenght as length',
          'distance01',
          'distance02',
        ])
        .innerJoin(
          Coverage,
          'coverage',
          'coverage_value.fk_coverage_id = coverage.id',
        )
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .where('coverage_value.ignore IS NULL')
        .andWhere('way."OSM_Id" IN (:...osm_ids)', { osm_ids: osm_ids })
        .getRawMany();

      // Filter and convert to correct format
      const result = await computeRoadConditions(rawRoadConditions);

      return {
        success: true,
        name: clicked_way.way_name,
        distance: result.distance,
        initial_distance: 0,
        road_geometry: result.geometry,
        conditions: result.conditions,
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async post(file: any) {
    if (!file.originalname.toLowerCase().endsWith('.rsp'))
      return { success: false, message: 'not a .rsp file' };

    const ds: any[] = parse_rsp(file.buffer.toString());

    return { success: true, message: 'file uploaded', data: ds };
  }

  async getPicturesFromLatLon(lat: number, lon: number) {
    try {
      const conditions = this.dataSource
        .getRepository(Condition_Pictures)
        .createQueryBuilder('condition_pictures')
        .select('DISTINCT ON(c.id) c.id, c.lat_mapped, c.lon_mapped, c.name')
        .from('condition_pictures', 'c')
        .where('ST_DISTANCE(ST_Point(c.lon_mapped, c.lat_mapped),geo2, 3)')
        .orderBy(
          'c.id, ST_Distance(ST_Point(c.lon_mapped, c.lat_mapped),ST_Point(lat,lon), 3)',
        );

      return {
        //needs to return pictures.
      };
    } catch (e) {}
  }
}
