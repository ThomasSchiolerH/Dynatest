import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
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
  async getRoadNames(@Query() query: {name: string}): Promise<any>{
    const {name} = query;
    return this.conditionsService.getRoadNames(name);
  }

  @Get('road/:id') // from the condition id clicked
  getRoadConditions(@Param() params: any) {
    return this.conditionsService.getRoadConditions(params.id);
  }

  @Get('way/:id')
  getWayContions(@Param() params: any) {
    return this.conditionsService.getWayConditions(params.id);
  }

  @Post('import/rsp')
  @UseInterceptors(FileInterceptor('fileName'))
  upload(@UploadedFile() file: any): any {
    return this.conditionsService.post(file);
  }

  /*  //attempt at getting the querey into this file
      @Get('conditionis/picture/:lat/:lon')
      getPicturesFromLatLon(@Param() params: any) {
          return this.conditionsService.getPicturesFromLatLon(lan, lon);
      }
    */
  @Post('import/zip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZipFile(
      @UploadedFile(
          new ParseFilePipeBuilder()
              .addFileTypeValidator({fileType: 'zip'})
              .addMaxSizeValidator({ maxSize: 2000000000 })
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
