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

import { parseRSP, parse_rsp_Pictures } from './dynatest.parser';

import {
    computeRoadConditions,
    computeWayConditions,
    addCoverageToDatabase,
    addCoverageValueToDatabase,
    addWayToDatabase, saveImageDataToDatabase, formatRoadImages,
} from './utility';

import { BufferedFile } from 'src/minio-client/file.model';
import { fetch_OSM_Ids } from './external_api_calls';

const JSZip = require("jszip");

interface ExtractedObject {
    name: string,
    dir: boolean,
    date: string,
    comment: string,
    unixPermissions: number,
    dosPermissions: number,
    _data: object,
    _dataBinary: boolean,
    options: object,
    unsafeOriginalName: string
}


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
    computed_before: string,
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
          'compute_time',
          'ST_AsGeoJSON(coverage.section_geom) AS section_geom',
          'way."IsHighway" AS IsHighway',
          'way."OSM_Id"',
          'way.way_name AS way_name'
        ])
        .innerJoin(
          Coverage,
          'coverage',
          'coverage_value.fk_coverage_id = coverage.id',
        )
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

      if (computed_before !== undefined) {
        conditions.andWhere('compute_time <= :computed_before', {
            computed_before,
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
            way_name: r.way_name,
            osm_id: r.OSM_Id
          },
        };
      }),
    };
  }

  /*async getClicked(coverage_value_id: string) {
    const conditions = this.dataSource
      .getRepository(Coverage_Values)
      .createQueryBuilder('coverage_value')
      .select([
        'way_name',
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
      .where('coverage_value.ignore IS NULL')
      .andWhere('coverage_value.id = :coverage_value_id', {
        coverage_value_id,
      });
    return await conditions.getRawOne();
  }*/

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
          'data_source'
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

      let roadImages: object[] | null = null;

        try {
            const subQuery = this.dataSource
                .createQueryBuilder()
                .select([
                    'condition_pictures.fk_way_id',
                    'distance',
                    'jsonb_agg(jsonb_build_object(\'url\', url, \'type\', type, \'distance\', distance)) AS data_by_distance'
                ])
                .from(Condition_Pictures, 'condition_pictures')
                .innerJoin(Ways, 'way', 'condition_pictures.fk_way_id = way.id')
                .where('way.OSM_Id IN (:...osmIds)', { osmIds: osm_ids})
                .groupBy('condition_pictures.fk_way_id, distance')
                .addGroupBy('condition_pictures.fk_way_id');

            const query = this.dataSource
                .createQueryBuilder()
                .select([
                    'subquery.fk_way_id',
                    'jsonb_agg(jsonb_build_object(\'distance\', subquery.distance, \'data\', subquery.data_by_distance)) AS data_by_distance'
                ])
                .from('(' + subQuery.getQuery() + ')', 'subquery')
                .setParameter('osmIds', osm_ids)
                .groupBy('subquery.fk_way_id');

            const results = await query.getRawMany();

            results.length ? roadImages = await formatRoadImages(results) : roadImages = null;
        } catch (e) {
            console.log(e);
        }

      return {
        success: true,
        road_name: clicked_way.way_name,
        road_distance: result.distance,
        initial_distance: 0,
        road_geometry: result.geometry,
        road: result.conditions,
        pictures: roadImages
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async uploadRSP(file: any) {
    const fetchedData: any[] = await parseRSP(file);
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
    console.log(wayId);//recommended to keep this around, so you can clean up the database when errors happen
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
        let imageIntArray: ExtractedObject[] = [];
        let imageRngArray: ExtractedObject[] = [];
        let image3DArray: ExtractedObject[] = [];
        let overlayIntArray: ExtractedObject[] = [];
        let overlayRngArray: ExtractedObject[] = [];
        let overlay3DArray: ExtractedObject[] = [];
        let coordinates: object[];
        const fileToProcess = new Uint8Array(file.buffer);
        JSZip.loadAsync(fileToProcess).then(zip => {
            const promises = []
            zip.forEach((name, file) => {
                if (name.toLowerCase().endsWith('.jpg') || name.toLowerCase().endsWith('.png')) {
                    if (name.toLowerCase().includes('imageint')) {
                        imageIntArray.push(file);
                    } else if (name.toLowerCase().includes('imagerng')) {
                        imageRngArray.push(file);
                    } else if (name.toLowerCase().includes('image3d')) {
                        image3DArray.push(file);
                    } else if (name.toLowerCase().includes('overlayint')) {
                        overlayIntArray.push(file);
                    } else if (name.toLowerCase().includes('overlayrng')) {
                        overlayRngArray.push(file);
                    } else if (name.toLowerCase().includes('overlay3d')) {
                        overlay3DArray.push(file);
                    } else {
                        console.warn('Unknown type of picture: ' + name);
                    }
                }
                if (name.toLowerCase().endsWith('.rsp')) {
                    // TODO: Call RSP IRI processing method below
                    // file.async("string").then(data => CALL RSP IRI PROCESSING FUNCTION HERE).catch(e => console.log(e));

                    const promise = file.async("string")
                        .then(data => this.uploadRSP(data))
                        .then(
                            file.async("string")
                                .then(data => {
                                    parse_rsp_Pictures(data)
                                        .then(coords => {
                                            coordinates = coords
                                        })
                                })
                        )
                        .catch(e => console.log(e));

                    promises.push(promise)
                }
            })

            imageIntArray.sort((a, b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0);
            imageRngArray.sort((a, b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0);
            image3DArray.sort((a, b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0);
            overlayIntArray.sort((a, b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0);
            overlayRngArray.sort((a, b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0);
            overlay3DArray.sort((a, b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0);

            return Promise.all(promises);
        }).then(async () => {
            let previousWayId: string = '';
            let distanceCounter: number = 0;
            for (const coordinate of coordinates) {
                const wayQuery = await this.dataSource
                    .getRepository(Ways)
                    .createQueryBuilder('ways')
                    .select([
                        'way.id',
                        'ST_DISTANCE(' +
                        'way.section_geom,' +
                        'ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) AS distance'
                    ])
                    .from('ways', 'way')
                    .where(
                        'ST_DWithin(' +
                        'way.section_geom,' +
                        'ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), 0.001)',
                    )
                    .setParameter('lon', coordinate[0])
                    .setParameter('lat', coordinate[1])
                    .distinct(true)
                    .orderBy('distance')
                    .getRawOne()

                const promises = [];

                if (wayQuery) {
                    try {
                        if (wayQuery.way_id !== previousWayId) {
                            // TODO: Calculate the initial distance from the starting point of the way
                            distanceCounter = 0;
                            previousWayId = wayQuery.way_id;
                        }

                        if (imageIntArray.length > 0) {
                            let fileObject: any = imageIntArray.shift();
                            const promise = fileObject.async('uint8array')
                                .then(image => { this.uploadImage({
                                    fieldname: '',
                                    originalname: fileObject.name,
                                    encoding: 'blob',
                                    mimetype: 'image/jpeg',
                                    size: fileObject._data.uncompressedSize,
                                    buffer: Buffer.from(image)
                                }).then(res => {
                                        saveImageDataToDatabase(
                                            this.dataSource,
                                            coordinate,
                                            fileObject.name,
                                            res.image_url,
                                            wayQuery.way_id,
                                            'ImageInt',
                                            distanceCounter)
                                    }
                                ).catch(e => {
                                    console.log(e);
                                    throw new HttpException("Internal server error", 500);
                                })})
                            promises.push(promise);
                        }

                        if (imageRngArray.length > 0) {
                            let fileObject: any = imageRngArray.shift();
                            const promise = fileObject.async('uint8array')
                                .then(image => { this.uploadImage({
                                    fieldname: '',
                                    originalname: fileObject.name,
                                    encoding: 'blob',
                                    mimetype: 'image/jpeg',
                                    size: fileObject._data.uncompressedSize,
                                    buffer: Buffer.from(image)
                                }).then(res => {
                                        saveImageDataToDatabase(
                                            this.dataSource,
                                            coordinate,
                                            fileObject.name,
                                            res.image_url,
                                            wayQuery.way_id,
                                            'ImageRng',
                                            distanceCounter)
                                    }
                                ).catch(e => {
                                    console.log(e);
                                    throw new HttpException("Internal server error", 500);
                                })})
                            promises.push(promise);
                        }

                        if (image3DArray.length > 0) {
                            let fileObject: any = image3DArray.shift();
                            const promise = fileObject.async('uint8array')
                                .then(image => { this.uploadImage({
                                    fieldname: '',
                                    originalname: fileObject.name,
                                    encoding: 'blob',
                                    mimetype: 'image/jpeg',
                                    size: fileObject._data.uncompressedSize,
                                    buffer: Buffer.from(image)
                                }).then(res => {
                                        saveImageDataToDatabase(
                                            this.dataSource,
                                            coordinate,
                                            fileObject.name,
                                            res.image_url,
                                            wayQuery.way_id,
                                            'Image3D',
                                            distanceCounter)
                                    }
                                ).catch(e => {
                                    console.log(e);
                                    throw new HttpException("Internal server error", 500);
                                })})
                            promises.push(promise);
                        }

                        if (overlayIntArray.length > 0) {
                            let fileObject: any = overlayIntArray.shift();
                            const promise = fileObject.async('uint8array')
                                .then(image => { this.uploadImage({
                                    fieldname: '',
                                    originalname: fileObject.name,
                                    encoding: 'blob',
                                    mimetype: 'image/jpeg',
                                    size: fileObject._data.uncompressedSize,
                                    buffer: Buffer.from(image)
                                }).then(res => {
                                        saveImageDataToDatabase(
                                            this.dataSource,
                                            coordinate,
                                            fileObject.name,
                                            res.image_url,
                                            wayQuery.way_id,
                                            'OverlayInt',
                                            distanceCounter)
                                    }
                                ).catch(e => {
                                    console.log(e);
                                    throw new HttpException("Internal server error", 500);
                                })})
                            promises.push(promise);
                        }

                        if (overlayRngArray.length > 0) {
                            let fileObject: any = overlayRngArray.shift();
                            const promise = fileObject.async('uint8array')
                                .then(image => { this.uploadImage({
                                    fieldname: '',
                                    originalname: fileObject.name,
                                    encoding: 'blob',
                                    mimetype: 'image/jpeg',
                                    size: fileObject._data.uncompressedSize,
                                    buffer: Buffer.from(image)
                                }).then(res => {
                                        saveImageDataToDatabase(
                                            this.dataSource,
                                            coordinate,
                                            fileObject.name,
                                            res.image_url,
                                            wayQuery.way_id,
                                            'OverlayRng',
                                            distanceCounter)
                                    }
                                ).catch(e => {
                                    console.log(e);
                                    throw new HttpException("Internal server error", 500);
                                })})
                            promises.push(promise);
                        }

                        if (overlay3DArray.length > 0) {
                            let fileObject: any = overlay3DArray.shift();
                            const promise = fileObject.async('uint8array')
                                .then(image => { this.uploadImage({
                                    fieldname: '',
                                    originalname: fileObject.name,
                                    encoding: 'blob',
                                    mimetype: 'image/jpeg',
                                    size: fileObject._data.uncompressedSize,
                                    buffer: Buffer.from(image)
                                }).then(res => {
                                        saveImageDataToDatabase(
                                            this.dataSource,
                                            coordinate,
                                            fileObject.name,
                                            res.image_url,
                                            wayQuery.way_id,
                                            'Overlay3D',
                                            distanceCounter)
                                    }
                                ).catch(e => {
                                    console.log(e);
                                    throw new HttpException("Internal server error", 500);
                                })})
                            promises.push(promise);
                        }

                        Promise.all(promises).then(res => distanceCounter+=2);
                    } catch (e) {
                        console.log(e);
                        throw new HttpException("Internal server error", 500);
                    }
                }
            }
        }).catch(e => {
            console.log(e);
            throw new HttpException("Internal server error", 500);
        })
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
