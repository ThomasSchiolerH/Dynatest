import {Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile, ParseFilePipeBuilder, HttpStatus, HttpException} from '@nestjs/common';
import { ConditionsService } from './conditions.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('conditions')
export class ConditionsController {
  constructor(private conditionsService: ConditionsService) {}
  @Get('')
  getConditions(
    @Query()
    query: {
      minLat: string;
      maxLat: string;
      minLng: string;
      maxLng: string;
      type: string;
      valid_before: string;
      valid_after: string;
      computed_after: string;
    },
  ): Promise<any> {
    const {
      minLat,
      maxLat,
      minLng,
      maxLng,
      type,
      valid_before,
      valid_after,
      computed_after,
    } = query;
    return this.conditionsService.getConditions(
      minLat,
      maxLat,
      minLng,
      maxLng,
      type,
      valid_before,
      valid_after,
      computed_after,
    );
  }

  @Get('road-names')
  getRoadNames() {
      return this.conditionsService.getRoadNames();
  }

  @Get('near_coverage_value/:id')
  getNearConditionsFromCoverageValueId(@Param() params: any) {
    return this.conditionsService.getNearConditionsFromCoverageValueId(
      params.id,
    );
  }

    @Get('road_data') // from the condition id clicked
    getRoadConditions(@Query() query: { coverage_value_id: string, wayName: string }):
        Promise<any> { const { coverage_value_id, wayName } = query; {
            return this.conditionsService.getRoadConditions(
                coverage_value_id, wayName
            );
    }}

  @Get('picture/:lat/:lon')
  getPicturesFromLatLon(@Param('lat') lan: number, @Param('lon') lon: number) {
      return this.conditionsService.getPicturesFromLatLon(lan, lon);
  }

  @Post('import/zip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZipFile(
      @UploadedFile(
          new ParseFilePipeBuilder()
              .addFileTypeValidator({fileType: 'zip'})
              .build({
                  exceptionFactory: e => {
                      if (e) {
                          throw new HttpException(
                              'Wrong file format',
                              HttpStatus.BAD_REQUEST
                          )
                      }
                  }
              })
      ) file: Express.Multer.File
  ) {
      return this.conditionsService.uploadZipFile(file);
  }
}
