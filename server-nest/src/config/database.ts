import * as dotenv from "dotenv";
import * as process from "process";
import {Injectable} from "@nestjs/common";
import {TypeOrmModuleOptions, TypeOrmOptionsFactory} from "@nestjs/typeorm";
import {Coverage_Values} from "../entity/Coverage_Values";
import {Coverage} from "../entity/Coverage";
import {Trips} from "../entity/Trips";
import {Ways} from "../entity/Ways";
import {Condition_Coverages} from "../entity/Condition_Coverages";
import {Condition_Pictures} from  "../entity/Condition_Pictures";
import {Map_References} from "../entity/Map_References";
dotenv.config();

const {
    DB_LIRAMAP_HOST, DB_LIRAMAP_PORT, DB_LIRAMAP_NAME, DB_LIRAMAP_USER, DB_LIRAMAP_PASSWORD
} = process.env

@Injectable()
export class DB_LIRAMAP_CONFIG implements TypeOrmOptionsFactory {

    createTypeOrmOptions(): TypeOrmModuleOptions {
        return {
            type: 'postgres',
            host : DB_LIRAMAP_HOST,
            port: Number(DB_LIRAMAP_PORT),
            database : DB_LIRAMAP_NAME,
            username : DB_LIRAMAP_USER,
            password : DB_LIRAMAP_PASSWORD,
            entities: [Condition_Coverages, Condition_Pictures, Coverage, Coverage_Values, Map_References, Trips, Ways]
        };
    }
}

