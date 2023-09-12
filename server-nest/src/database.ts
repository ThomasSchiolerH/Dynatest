
import * as dotenv from "dotenv";
dotenv.config();

const { 
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
    DB_USER_VIS, DB_PASSWORD_VIS, 
    DB_USER_POSTGIS, DB_PWD_POSTGIS,
    DB_LIRAMAP_HOST, DB_LIRAMAP_PORT, DB_LIRAMAP_NAME, DB_LIRAMAP_USER, DB_LIRAMAP_PASSWORD
} = process.env;


const BASE_CONFIG = {
    client: 'pg',
    debug: true,
    useNullAsDefault: true,
    pool: {
        min: 2,
        max: 10,
        "createTimeoutMillis": 3000,
        "acquireTimeoutMillis": 30000,
        "idleTimeoutMillis": 30000,
        "reapIntervalMillis": 1000,
        "createRetryIntervalMillis": 100,
        "propagateCreateError": false
    },
    log: {
        warn(msg: any) { console.log('warning', msg); },
        error(msg: any) { console.log('error', msg); },
        deprecate(msg: any) { console.log('deprecate', msg); },
        debug(msg: any) { console.log('debug', msg); },
    }
}

export const LIRA_DB_CONFIG = {
    ...BASE_CONFIG,
    connection: {
        host : DB_HOST, // "liradb.compute.dtu.dk", // "liradbdev.compute.dtu.dk",
        port: DB_PORT, // 5435,
        database : DB_NAME,  // "postgres",
        user : DB_USER,
        password : DB_PASSWORD
    },
}


export const VISUAL_DB_CONFIG = {
    ...BASE_CONFIG,
    connection: {
        host : "liravisualization.postgres.database.azure.com",
        port: 5432,
        user : DB_USER_VIS,
        password : DB_PASSWORD_VIS,
        database : "postgres",
        ssl: true
    },
}

export const POSTGIS_DB_CONFIG = {
    ...BASE_CONFIG,
    connection: {
        host : "liradb.postgres.database.azure.com",
        port: 5432,
        user : DB_USER_POSTGIS,
        password : DB_PWD_POSTGIS,
        database : "postgis",
        ssl: true
    },
}


export const DB_LIRAMAP_CONFIG = {
    ...BASE_CONFIG,
    connection: {
        host : DB_LIRAMAP_HOST,
        port: DB_LIRAMAP_PORT,
        database : DB_LIRAMAP_NAME,
        user : DB_LIRAMAP_USER,
        password : DB_LIRAMAP_PASSWORD
    }
}