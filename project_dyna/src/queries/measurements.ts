import { MeasProperties, ActiveMeasProperties } from "../models/properties";
import { get, put, deleteReq } from "./fetch";


export const getMeasurements = ( callback: React.Dispatch<React.SetStateAction<ActiveMeasProperties[]>> ) => {
    get('/measurements', (data: MeasProperties[]) => {
        console.log(data);
        callback( data.map( meas => { 
            return { ...meas, isActive: false } 
        } ) )
    })
}

export const addMeasurement = (measurement: MeasProperties) => {
	put('/measurements/add', measurement)
}

export const editMeasurement = (measurement: MeasProperties, index: number) => {
	put('/measurements/edit', { measurement: measurement, index: index } )
}

export const deleteMeasurement = (measurement: MeasProperties) => {

    deleteReq('/measurements/' + encodeURIComponent(measurement.dbName + ':' + measurement.name))
}