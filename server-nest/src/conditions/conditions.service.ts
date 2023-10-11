import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Coverage_Values } from '../entity/Coverage_Values';
import { Coverage } from '../entity/Coverage';
import { Ways } from '../entity/Ways';
import { Trips } from '../entity/Trips';

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

  async getTripId(coverage_value_id: string): Promise<string> {
    try {
      const conditions = this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select('fk_trip_id')
        .innerJoin(
          Coverage,
          'coverage',
          'coverage_value.fk_coverage_id = coverage.id',
        )
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .innerJoin(Trips, 'trip', 'coverage.fk_trip_id = trip.id')
        .where('coverage_value.id = :cov_value_id', {
          cov_value_id: coverage_value_id,
        });
      const res: any = await conditions.getRawOne();
      return res.fk_trip_id;
    } catch (e) {
      return 'null';
    }
  }

  async getWayName(coverage_value_id: string): Promise<string> {
    try {
      const conditions = this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select('way_name')
        .innerJoin(
          Coverage,
          'coverage',
          'coverage_value.fk_coverage_id = coverage.id',
        )
        .innerJoin(Ways, 'way', 'coverage.fk_way_id = way.id')
        .where('coverage_value.id = :cov_value_id', {
          cov_value_id: coverage_value_id,
        });
      const res: any = await conditions.getRawOne();
      return res.way_name;
    } catch (e) {
      return 'null';
    }
  }

  async getNearConditionsFromCoverageValueId(coverage_value_id: string) {
    const way_name: string = await this.getWayName(coverage_value_id);
    const trip_id = await this.getTripId(coverage_value_id);
    let raw: any[];
    const grouped: any[] = [];
    const res: any[] = [];
    const n: number = 5;
    let first: boolean = true;

    try {
      const conditions = this.dataSource
        .getRepository(Coverage_Values)
        .createQueryBuilder('coverage_value')
        .select([
          'coverage_value."id" as coverage_value_id',
          'coverage."id" as coverage_id',
          'type',
          'value',
          'lenght AS length',
          'ST_AsGeoJSON(coverage.section_geom, 5, 0) AS section_geom',
          'way."IsHighway" AS is_highway',
          'compute_time',
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
      const index_coverage_value_id: number = raw.findIndex(
        (r): boolean => r.coverage_value_id == coverage_value_id,
      );
      const coverage_id: string = raw[index_coverage_value_id].coverage_id;

      raw.forEach((r) => {
        if (!first && r.coverage_id == grouped.at(-1).coverage_id) {
          grouped.at(-1).coverage.push({ type: r.type, value: r.value });
        } else {
          first = false;
          grouped.push({
            coverage_value_id: r.coverage_value_id,
            coverage_id: r.coverage_id,
            length: r.length,
            section_geom: r.section_geom,
            is_highway: r.is_highway,
            coverage: [{ type: r.type, value: r.value }],
          });
        }
      });

      const index_coverage_id: number = grouped.findIndex(
        (r): boolean => r.coverage_id == coverage_id,
      );

      for (
        let i: number = Math.max(0, index_coverage_id - n);
        i < Math.min(index_coverage_id + n + 1, raw.length);
        i++
      ) {
        res.push({
          length: grouped[i].length,
          is_highway: grouped[i].is_highway,
          section_geom: grouped[i].section_geom,
          coverage: grouped[i].coverage,
        });
      }
      return {
        success: true,
        way_name: way_name,
        current_way: index_coverage_id,
        coverage: res,
      };
    } catch (e) {
      return { success: false };
    }
  }
}
