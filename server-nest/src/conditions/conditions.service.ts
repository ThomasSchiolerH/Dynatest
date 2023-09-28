import {Injectable} from "@nestjs/common";
import {InjectDataSource} from "@nestjs/typeorm";
import {DataSource} from "typeorm";
import {Coverage_Values} from "../entity/Coverage_Values";
import {Coverage} from "../entity/Coverage";
import {Ways} from "../entity/Ways";
import {Trips} from "../entity/Trips";


@Injectable()
export class ConditionsService {
    constructor(
        @InjectDataSource('lira-map')
        private dataSource: DataSource
    ) {}
    async getConditions(
        minLat: string, maxLat: string, minLng: string, maxLng: string,
        type: string,
        valid_before: string, valid_after: string,
        computed_after: string) {

        let res;
        try {
            let conditions = this.dataSource
                .getRepository(Coverage_Values)
                .createQueryBuilder('coverage_values')
                .select([
                    'coverage_values.id',
                    'type', 'value', 'std',
                    'start_time_utc', 'compute_time',
                    'task_id',
                    'ST_AsGeoJSON(coverage.section_geom) AS section_geom',
                    'ways.IsHighway'
                ])
                .innerJoin(Coverage, 'coverage','coverage_values.fk_coverage_id = coverage.id')
                .innerJoin(Trips, 'trips', 'coverage.fk_trip_id = trips.id')
                .innerJoin(Ways, 'ways','coverage.fk_way_id = ways.id')
                .where('coverage_values.ignore IS NULL');
            if (type !== undefined) {
                conditions.andWhere('type = :type', { type });
            }

            const minLatNo = Number(minLat)
            const maxLatNo = Number(maxLat)
            const minLngNo = Number(minLng)
            const maxLngNo = Number(maxLng)
            if (!isNaN(minLatNo) && !isNaN(maxLatNo) &&
                !isNaN(minLngNo) && !isNaN(maxLngNo) ) {
                conditions.andWhere('ST_Intersects(ST_MakeEnvelope(minLngNo,minLatNo, maxLngNo,maxLatNo), section_geom')
            }

            if (valid_after !== undefined) {
                conditions.andWhere('start_time_utc >= :valid_after', { valid_after })
            }

            if (valid_before !== undefined) {
                conditions.andWhere('start_time_utc <= :valid_before', { valid_before })
            }

            if (computed_after !== undefined) {
                conditions.andWhere('compute_time > :computed_after', { computed_after })
            }

            console.log(conditions.getQuery());
            res = await conditions.getMany();
        } catch (e) {
            console.log(e)
            return {
                type: "FeatureCollection",
                features: []
            }
        }

        return {
            type: "FeatureCollection",
            features: res.map( (r) => {
                console.log(r);
                return {
                    type: "Feature",
                    geometry: JSON.parse(r.section_geom),
                    properties: {
                        id: r.id,
                        type: r.type,
                        value: r.value,
                        std: r.std,
                        valid_time: r.start_time_utc,
                        motorway: r.IsHighway,
                        compute_time: r.compute_time,
                        task_id: r.task_id
                    }
                }
            })
        }
    }
}