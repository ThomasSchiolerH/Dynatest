
import { Injectable } from '@nestjs/common';
import { write } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { Measurement } from 'src/models';

@Injectable()
export class MeasurementsService 
{
    path: string;

    constructor() {
        this.path = __dirname + '/measurements.json'
    }

    async writeFile( measurements: Measurement[] )
    {   // TODO ekki@dtu.dk error handling: in particular if file is not there, it should be created
        return await writeFile(this.path, JSON.stringify(measurements, null, 4), 'utf8');
    }

    async getMeasurements()
    {   // TODO ekki@dtu.dk error handling: in particular if file is not there, it should be
        // created (at best with some defaults)
        const file = await readFile(this.path, 'utf-8')
        return JSON.parse(file) as Measurement[];
    }

    async addMeasurement(measurement: Measurement) 
    {   // TODO ekki@dtu.dk error handling
        const measurements = await this.getMeasurements() 
        const updatedFile = [...measurements, measurement]
        return await this.writeFile(updatedFile)
    }

    async editMeasurement(index: number, measurement: Measurement) 
    {   // TODO ekki@dtu.dk error handling
        const measurements = await this.getMeasurements()
        // const updatedFile = [...measurements]
        measurements[index] = measurement;
        // updatedFile[index] = measurement
        return await this.writeFile(measurements);
    }

    async deleteMeasurement( id:string) {
        // TODO ekki@dtu.dk error handling
        const measurements = await this.getMeasurements()
        const result = measurements.filter((measurement,index) => (measurement.dbName + ":" + measurement.name !== id))
        return await this.writeFile(result)
    }
}
