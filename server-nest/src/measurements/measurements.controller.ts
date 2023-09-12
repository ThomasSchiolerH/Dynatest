import { Controller, Get, Put, Query, Body, Delete, Param } from '@nestjs/common';
import { Measurement } from 'src/models';

import { MeasurementsService } from './measurements.service';


@Controller('measurements')
export class MeasurementsController
{
    constructor(private readonly service: MeasurementsService) {}

    @Get()
    getMeasurements(): Promise<Measurement[]> 
    {
        return this.service.getMeasurements();
    }

    @Put('/add')
    addtMeasurement( @Body() measurement: Measurement ): Promise<any>
    {
        // TODO ekki@dtu.dk: error handling
        return this.service.addMeasurement(measurement);
    }

    @Put('/edit')
    editMeasurement( @Body() body: { index: number, measurement: Measurement } ): Promise<any>
    {
        // TODO ekki@dtu.dk: error handling
        return this.service.editMeasurement(body.index, body.measurement);
    }

    @Delete(':id')
    deleteMeasurement( @Param('id') id:string) : Promise<any>
    {
        // TODO ekki@dtu.dk: the measurements, unfortunately do not have an specific id.
        //  This should eventually be changed (properly addressing resources in REST requests.
        //  For no the id will be the name and dbName concatenated!
        return this.service.deleteMeasurement(id);
    }

}
