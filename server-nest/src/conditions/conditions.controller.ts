import {Controller, Get, Query} from "@nestjs/common";
import {ConditionsService} from "./conditions.service";


@Controller('conditions')
export class ConditionsController {
    constructor(private conditionsService: ConditionsService) {}
    @Get('')
    getConditions(
        @Query() query: {
            minLat: string, maxLat: string, minLng: string, maxLng: string,
            type: string,
            valid_before: string, valid_after: string,
            computed_after: string }): Promise<any> {
        const  { minLat, maxLat, minLng, maxLng, type, valid_before, valid_after, computed_after } = query
        return this.conditionsService.getConditions(minLat, maxLat, minLng, maxLng, type, valid_before, valid_after, computed_after);
    }
}