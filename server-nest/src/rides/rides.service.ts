import { Injectable } from '@nestjs/common';
import { InjectConnection } from 'nestjs-knex';
import { Knex } from 'knex';

import { RideMeta } from './models.rides';
import { BoundedPath, PointData } from 'src/models';

import { getDistance } from 'geolib';

/*
@Injectable()
export class RidesService
{
    constructor(@InjectConnection('lira-main') private readonly knex: Knex) {}

    async getRides(): Promise<RideMeta[]>
    {
        return await this.knex
            .select( '*' )
            .from( { public: 'Trips' } )
            .whereNot( 'TaskId', 0 )
            .orderBy('TaskId')
    }

    async getRide( tripId: string, dbName: string ): Promise<BoundedPath>
    {
        console.log(tripId, dbName);

        const res = await this.knex
            .select( [ 'message', 'lat', 'lon', 'Created_Date' ] )
            .from( { public: 'Measurements' } )
            .where( { 'FK_Trip': tripId, 'T': dbName } )
            .whereNot( { 'lat': null, 'lon': null } )

        let minX = new Date(Number.MAX_SAFE_INTEGER).getTime();
        let maxX = new Date(Number.MIN_SAFE_INTEGER).getTime();
        let minY = Number.MAX_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;

        const path = res
            .map( (msg: any) => {
                const json = JSON.parse(msg.message);
                const value = json[dbName + '.value'];
                const timestamp = new Date( msg.Created_Date )

                minX = Math.min(minX, timestamp.getTime());
                maxX = Math.max(maxX, timestamp.getTime());
                minY = Math.min(minY, value)
                maxY = Math.max(maxY, value)

                return { lat: msg.lat, lng: msg.lon, value, metadata: { timestamp } } as PointData
            } )
            .sort( (a: PointData, b: PointData) =>
                a.metadata.timestamp - b.metadata.timestamp
            )

        return { path, bounds: { minX, maxX, minY, maxY } }
    }
}
*/

interface LatLonTime {
    lat: number
    lon: number
    time: number
    dist: number
}

// TODO this is an ad hoc interpolator for the position of a measurement that does have no GPS position,
//      but only time. The position is interpolated based on the closest track position
//      before an after the measurement on the trip.
const interpolatorPos = (pos1: LatLonTime, time: number, pos2: LatLonTime) => {
    const deltaLat = pos2.lat - pos1.lat
    const deltaLon = pos2.lon - pos1.lon
    const deltaDist = pos2.dist - pos1.dist
    const t1 = pos1.time
    const t2 = pos2.time
    const deltaT = t2 - t1
    const t = time - t1
    const lat = deltaT > 0 ? pos1.lat + deltaLat * t / deltaT : pos1.lat
    const lon = deltaT > 0 ? pos1.lon + deltaLon * t / deltaT : pos1.lon
    const dist = deltaT > 0 ? pos1.dist + deltaDist * t / deltaT : pos1.dist
    return { lat: lat, lon: lon, time: time, dist: dist } as LatLonTime
}

@Injectable()
export class RidesService
{
    constructor(@InjectConnection('lira-main') private readonly knex: Knex) {}

    async getRides(): Promise<RideMeta[]>
    {
        return await this.knex
            .select( '*' )
            .from( { public: 'Trips' } )
            .whereNot( 'TaskId', 0 )
            .orderBy('TaskId')
    }

    // TODO ekki@dtu.dk this was the original getRide method, which is now used only
    //      for getting the data from 'track.pos'; this needs to be cleaned up
    // async getRide( tripId: string, dbName: string ): Promise<BoundedPath>
    async getRidePos( tripId: string, dbName: string ): Promise<BoundedPath>
    {
        console.log(tripId, dbName);

        // const res = await this.knex
        const res = await this.knex
            // .select( [ 'message', 'lat', 'lon', 'Created_Date' ] )
            .select( [ 'message', 'lat', 'lon', 'TS_or_Distance' ] )
            .from( { public: 'Measurements' } )
            .where( { 'FK_Trip': tripId, 'T': dbName } )
            .whereNot( { 'lat': null, 'lon': null } )
            .orderBy('TS_or_Distance')

        let minX = 0 // new Date(Number.MAX_SAFE_INTEGER).getTime();
        let maxX = 0 // new Date(Number.MIN_SAFE_INTEGER).getTime();
        let minY = Number.MAX_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;

        var firsttimestamp: number;

        const path = res
            .map( (msg: any) => {
                const json = JSON.parse(msg.message);
                const value = json[dbName + '.value'];
                const absTime = msg.TS_or_Distance;
                let timestamp = new Date( absTime ).getTime()
                if (!firsttimestamp) {
                    firsttimestamp = timestamp
                    timestamp = 0
                } else {
                    timestamp = timestamp - firsttimestamp
                }

                minX = Math.min(minX, timestamp);
                maxX = Math.max(maxX, timestamp);
                minY = Math.min(minY, value)
                maxY = Math.max(maxY, value)

                return { lat: msg.lat, lng: msg.lon, value, metadata: { dateTime: absTime, timestamp: timestamp } } as PointData
            } )
            // .sort( (a: PointData, b: PointData) =>
            //    a.metadata.timestamp - b.metadata.timestamp
            // )

        return { path, bounds: { minX, maxX, minY, maxY } }
    }


    async getRide( tripId: string, dbName: string ): Promise<BoundedPath> {
        let dbTag = dbName

        if (dbTag == 'track.pos') {
            // TODO ekki@dtu.dk if only track position data are needed, we can use the original query since
            // the positions do not need to be interpolated. But, this should be cleaned up at some place
            return this.getRidePos(tripId,dbTag);
        }

        const dBNameSplit = dbTag.split(".");
        let valueAttribute = "value"

        if (dBNameSplit.length === 3 &&
            dBNameSplit[0] === "acc" && dBNameSplit[1] === "xyz" &&
            ( dBNameSplit[2] === "x" ||
                dBNameSplit[2] === "y" ||
                dBNameSplit[2] === "z" )) {
            valueAttribute = dbTag
            dbTag = "acc.xyz"
        } else {
            valueAttribute = dbTag + ".value"
        }

        console.log(tripId, dbTag, valueAttribute);

        const res = await this.knex
            .select( [ 'message', 'T', 'lat', 'lon', 'TS_or_Distance' ] )
            .from( { public: 'Measurements' } )
            .where( { 'FK_Trip': tripId })
            .where(builder => builder
                .where( {'T': dbTag})
                .orWhere( {'T': 'track.pos'}))
            .orderBy('TS_or_Distance')

        let minX = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;

        let pos1: LatLonTime = undefined
        let pos1index: number = undefined
        let pos2: LatLonTime = undefined
        let pos2index: number = undefined

        const path:PointData[] = [];
        let i = 0;
        let count = 0;
        while (i < res.length && pos1 == undefined) {
            const msg = res.at(i)
            if (msg.T == 'track.pos' && msg.lat != undefined && msg.lon != undefined && msg.TS_or_Distance != undefined) {
                pos1 = {  lat: msg.lat, lon: msg.lon, time: new Date(msg.TS_or_Distance).getTime(), dist: 0.0 }
                pos1index = i
            }
            i++
        }
        if (pos1 == undefined) {
            // TODO exception handling
            return { path, bounds: { minX, maxX, minY, maxY } }
        }
        const startTimems = pos1.time
        let lastTimems = undefined
        while (i < res.length) {
            const msg = res.at(i)
            if (msg.T == 'track.pos' && msg.lat != undefined && msg.lon != undefined && msg.TS_or_Distance != undefined) {
                const dist = pos1.dist + getDistance( pos1, {lat: msg.lat, lon: msg.lon}, 0.01 )
                pos2 = {  lat: msg.lat, lon: msg.lon, time: new Date(msg.TS_or_Distance).getTime(), dist: dist }
                pos2index = i

                for (let j = pos1index + 1; j < pos2index; j++) {
                    const msg = res.at(j)
                    const json = JSON.parse(msg.message);
                    const value = json[valueAttribute];
                    // TODO note that also this value could be interpolated, if it is not there
                    //      here we just ignore the measurement if the value is undefined
                    const absTime = new Date(msg.TS_or_Distance)
                    const absTimems = absTime.getTime()
                    if (msg.T == dbTag && absTime != undefined && value != undefined) {
                        // in order to reduce the number of values, we take the value only if the
                        // last value is older than a second (1000ms)
                        // TODO ekki@dtu.dk could be refined
                        if (lastTimems == undefined || absTimems - lastTimems > 1000) {

                            const relTimems = absTimems - startTimems
                            // const relTime = new Date(relTimems) // make time relative from start
                            // TODO ekki@dtu.dk abusing Date here a bit

                            // TODO ekki@dtu.dk interpolator could be refined
                            const pos = interpolatorPos(pos1, absTime.getTime(), pos2)
                            const data = {lat: pos.lat, lng: pos.lon, value: value,
                                metadata: {type: dbName, dateTime: absTime, timestamp: relTimems, dist: pos.dist}} as PointData
                            path.push(data)
                            minX = Math.min(minX, relTimems)
                            maxX = Math.max(maxX, relTimems)
                            minY = Math.min(minY, value)
                            maxY = Math.max(maxY, value)
                            lastTimems = absTimems
                        }
                        count++
                    }
                }
                pos1 = pos2
                pos1index = pos2index
                pos2 = undefined
                pos2index = undefined
                i++
            } else {
                // at this point the messages are ignored (it will be handled, when a new pos2 is encountered
                // and the positions will be interpolated. If no new position pos2 will be found after a
                // measurement, then the measurements are ignored (as will be measurements without a value)
                i++
            }
        }

        /*
        const path = res
            .map( (msg: any) => {
                const json = JSON.parse(msg.message);
                const value = json[dbName + '.value'];
                // const timestamp = new Date( msg.Created_Date )
                const time = new Date( msg.TS_or_Distance)

                minX = Math.min(minX, timestamp.getTime());
                maxX = Math.max(maxX, timestamp.getTime());
                minY = Math.min(minY, value)
                maxY = Math.max(maxY, value)

                return { lat: msg.lat, lng: msg.lon, value, metadata: { timestamp } } as PointData
            } )
            .sort( (a: PointData, b: PointData) =>
                a.metadata.timestamp - b.metadata.timestamp
            )

         */

        /* TODO ekki@dtu.dk: As far as I could see the bounds are computed on the client side;
           so I guess they would not need to be part of the reply. At some point this could
           be removed. But, would need to check whether there are requests using the
           bounds from this service directly.
         */
        return { path, bounds: { minX, maxX, minY, maxY } }
    }

}
