import {Controller, Get, Header, Param, Query} from '@nestjs/common';
import { ConditionsService } from './conditions.service';

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

  @Get('near_coverage_value/:id')
  getNearConditionsFromCoverageValueId(@Param() params: any) {
    return this.conditionsService.getNearConditionsFromCoverageValueId(
      params.id,
    );
  }

  @Get('road-pictures-path')
    getRoadPicturesPath() {
      return this.conditionsService.getRoadPicturesPath();
  }

  @Get('picture/:lat/:lon')
  //@Header('Content-type', 'image/jpg')
  getPicturesFromLatLon(@Param() lan: number, lon: number) {
      return this.conditionsService.getPicturesFromLatLon(lan, lon);
  }
}
