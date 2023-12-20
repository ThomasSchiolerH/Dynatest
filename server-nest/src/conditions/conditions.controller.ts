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
      computed_before: string;
      computed_after: string;
    },
  ): Promise<any> {
    const {
      minLat,
      maxLat,
      minLng,
      maxLng,
      type,
      computed_before,
      computed_after,
    } = query;
    return this.conditionsService.getConditions(
      minLat,
      maxLat,
      minLng,
      maxLng,
      type,
      computed_before,
      computed_after,
    );
  }

  @Get('road-names') // Find the road names which prefix is given as argument
  async getRoadNames(@Query() query: { name: string }): Promise<any> {
    const { name } = query;
    return this.conditionsService.getRoadNames(name);
  }

  @Get('road/:id') // The id is the osm way id clicked by the user
  getRoadConditions(@Param() params: any) {
    return this.conditionsService.getRoadConditions(params.id);
  }

  @Get('way/:id') // The id is the osm way id clicked by the user
  getWayContions(@Param() params: any) {
    return this.conditionsService.getWayConditions(params.id);
  }

  // An endpoint used to import data from a .rsp file
  // mainly used for testing
  @Post('import/rsp')
  @UseInterceptors(FileInterceptor('fileName'))
  upload(@UploadedFile() file: any): any {
    return this.conditionsService.uploadRSP(file);
  }

  // The endpoint used to import data contained in a .zip file
  @Post('import/zip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZipFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: 'zip' })
        .addMaxSizeValidator({ maxSize: 300000000 })
        .build({
          exceptionFactory: (e) => {
            if (e) {
              throw new HttpException(
                'Wrong file format',
                HttpStatus.BAD_REQUEST,
              );
            }
          },
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.conditionsService.uploadZipFile(file);
  }
}
