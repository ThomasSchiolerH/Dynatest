import { HttpException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MultiLineString } from 'typeorm';
import { Coverage_Values } from '../entity/Coverage_Values';
import { Coverage } from '../entity/Coverage';
import { Ways } from '../entity/Ways';
import { Trips } from '../entity/Trips';
import { Condition_Pictures } from '../entity/Condition_Pictures';
import { MinioClientService } from 'src/minio-client/minio-client.service';
import { DBUpload } from '../entity/Internal_Types';

import { parseRSP } from './dynatest.parser';

import {
  computeRoadConditions,
  computeWayConditions,
  addCoverageToDatabase,
  addCoverageValueToDatabase,
  addWayToDatabase,
} from './utility';

import { BufferedFile } from 'src/minio-client/file.model';
import { fetch_OSM_Ids } from './external_api_calls';

import JSZip from 'jszip';

@Injectable()
export class ConditionsService {
  constructor(
    @InjectDataSource('lira-map')
    private dataSource: DataSource,
    private minioClientService: MinioClientService,
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
          'way.way_name AS way_name',
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
            way_name: r.way_name,
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
        'length AS length',
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
          'length',
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
          'way."OSM_Id"',
          'way_name',
          'length',
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
      const osm_ids: number[] = await fetch_OSM_Ids(
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
          'length',
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
        road_name: clicked_way.way_name,
        road_distance: result.distance,
        initial_distance: 0,
        road_geometry: result.geometry,
        road: result.conditions,
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async uploadRSP(file: any) {
    if (!file.originalname.toLowerCase().endsWith('.rsp'))
      return { success: false, message: 'not a .rsp file' };

    const fetchedData: any[] = await parseRSP(file.buffer.toString());
    const data: any[] = [];
    for (let i = 0; i < fetchedData[1].length; i++) {
      //takes the fetched data and set it up right
      const toAdd: DBUpload = {
        way: {
          way_name: fetchedData[0][0],
          OSM_Id: fetchedData[0][1],
          node_start: fetchedData[0][2],
          node_end: fetchedData[0][3],
          length: fetchedData[0][4],
          section_geom: fetchedData[0][5],
          is_highway: fetchedData[0][6],
        },
        coverage: {
          distance01: fetchedData[1][i][0],
          distance02: fetchedData[1][i][1],
          lat_mapped: fetchedData[1][i][2],
          lon_mapped: fetchedData[1][i][3],
          compute_time: fetchedData[1][i][4],
          section_geom: fetchedData[1][i][5],
        },
        coverage_value: {
          value: fetchedData[2][i][0],
          type: fetchedData[2][i][1],
        },
      };
      data.push(toAdd);
    }
    const wayId = await addWayToDatabase(
      this.dataSource,
      data[0].way.OSM_Id,
      data[0].way.way_name,
      data[0].way.node_start,
      data[0].way.node_end,
      data[0].way.length,
      data[0].way.section_geom,
      data[0].way.is_highway,
    ).catch((e): void => {
      console.log(e);
      throw new HttpException('Internal server error', 500);
    });
    console.log(wayId);
    const coverageID = [];
    for (const e of data) {
      if (typeof wayId === 'string') {
        const id = await addCoverageToDatabase(
          this.dataSource,
          e.coverage.distance01,
          e.coverage.distance02,
          e.coverage.compute_time,
          e.coverage.lat_mapped,
          e.coverage.lon_mapped,
          e.coverage.section_geom,
          wayId,
        ).catch((e): void => {
          console.log(e);
          throw new HttpException('internal server error', 500);
        });
        coverageID.push(id);
      }
    }
    console.log(coverageID);
    for (let i = 0; i < data.length - 1; i++) {
      for (let j = 0; j < i; j++) {
        if (coverageID[i] == coverageID[j]) {
          i++;
          j = 0;
        }
      }
      if (i >= data.length - 1) {
        break;
      }
      addCoverageValueToDatabase(
        this.dataSource,
        data[i].coverage_value.type,
        data[i].coverage_value.value,
        coverageID[i],
      ).catch((e): void => {
        console.log(e);
        //throw new HttpException('internal server error', 500);
      });
      console.log(coverageID[i]);
    }

    /*
    data.forEach((e: DBUpload): void => {
      addCoverageValueToDatabase(
        this.dataSource,
        e.coverage_value.type,
        e.coverage_value.value,
        coverageID[e],
      ).catch((e): void => {
        console.log(e);
        throw new HttpException('internal server error', 500);
      });
    });
*/
    return { success: true, message: 'file uploaded', data: data };
  }

  // TODO Get related pictures from MinIO
  async getPicturesFromLatLon(lat: number, lon: number) {
    try {
      const pictureName = this.dataSource
        .getRepository(Condition_Pictures)
        .createQueryBuilder('condition_pictures')
        .select([
          'ST_DISTANCE(' +
            'ST_Transform(ST_Point(condition_picture.lat_mapped, condition_picture.lon_mapped, 4326), 3857),' +
            'ST_Transform(ST_Point(:lat, :lon, 4326), 3857)) AS distance',
          'condition_picture."name"',
        ])
        .from('condition_pictures', 'condition_picture')
        .where(
          'ST_DISTANCE(' +
            'ST_Transform(ST_Point(condition_picture.lat_mapped, condition_picture.lon_mapped, 4326), 3857),' +
            'ST_Transform(ST_Point(:lat, :lon, 4326), 3857)) < 3',
        )
        .setParameter('lat', lat)
        .setParameter('lon', lon)
        .orderBy('distance')
        .getRawOne();
      console.log(await pictureName.then((res) => res.name));

      return {
        //needs to return pictures.
      };
    } catch (e) {
      console.log(e);
      throw new HttpException('Internal server error', 500);
    }
  }

  async uploadZipFile(file: Express.Multer.File) {
    // TODO Extract ZIP file
    const fileToProcess = new Uint8Array(file.buffer);
    JSZip.loadAsync(fileToProcess)
      .then((zip) => {
        zip.forEach((name, file) => {
          if (name.toLowerCase().endsWith('.rsp')) {
            // TODO: Call RSP method below
            // file.async("string").then(data => CALL RSP FUNCTION HERE).catch(e => console.log(e));
          }
        });

        //TODO: Sample usage of adding data to DB from RSP, customize it
        /*addWayToDatabase(this.dataSource, 1, "Test", 1, 1, 1, '{ "type": "MultiLineString", "coordinates": [[ [100.0, 0.0], [101.0, 1.0] ],[ [102.0, 2.0], [103.0, 3.0] ]] }', false)
                .then(wayId => {
                    addCoverageToDatabase(this.dataSource, 1, 1, new Date().toISOString(), 1, 1, '{ "type": "MultiLineString", "coordinates": [[ [100.0, 0.0], [101.0, 1.0] ],[ [102.0, 2.0], [103.0, 3.0] ]] }', wayId)
                        .then(coverageId => addCoverageValueToDatabase(this.dataSource, "IRI", 1, coverageId))
                }).catch(e => {
                    console.log(e);
                    throw new HttpException("Internal server error", 500);
                });*/
      })
      .catch((e) => {
        console.log(e);
        throw new HttpException('Internal server error', 500);
      });
    // TODO Validate the file structure inside
    // TODO Various processing of different datatypes

    // For now it just says error
    throw new HttpException('Internal server error', 500);

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

  async getRoadNames(road_name: string) {
    road_name = road_name.toLowerCase().trim();
    try {
      const roadNames = this.dataSource
        .getRepository(Ways)
        .createQueryBuilder('way')
        .select([
          'way_name',
          'AVG(lat_mapped) as lat',
          'AVG(lon_mapped) as lon',
        ])
        .innerJoin(Coverage, 'coverage', 'coverage.fk_way_id = way.id')
        .where('LOWER(way_name) LIKE :name', { name: road_name + '%' })
        .groupBy('way_name')
        .orderBy('way_name', 'ASC')
        .getRawMany();

      const res: any[] = await roadNames;
      return res.reduce(function (acc, e) {
        acc.push({
          road_name: e.way_name,
          coordinates: { lat: e.lat, lng: e.lon },
        });
        return acc;
      }, []);
    } catch (e) {
      console.log(e);
      throw new HttpException('Internal server error', 500);
    }
  }
}
