import { useEffect, useRef, useState } from "react"
import  ReactSlider  from "react-slider"
import {MapContainer, TileLayer, ScaleControl, GeoJSON, useMap} from 'react-leaflet'
import {Layer, LeafletMouseEvent, PathOptions} from "leaflet"
import { Feature, FeatureCollection } from 'geojson'
import { useData } from "../context/RoadDataContext";
import L from 'leaflet';

import Zoom from '../map/zoom'
import { MAP_OPTIONS } from '../map/mapConstants'
import { get } from '../queries/fetch'

import ConditionToggleButtons from './ConditionToggleButtons';

import "../css/slider.css";
import "../css/map.css";
import "../css/DataWindow.css";
import SearchBar from "./SearchBar";

const ALL = "ALL"
const KPI = "KPI"
const DI = "DI"
const IRI = "IRI"
const IRInew = "IRI_new"
const Mu = "Mu"
const Enrg = "E_norm"
const NONE = "NONE";
const muSymbol = '\u03BC';

const conditionTypes = [
    //NONE,
    ALL,
    KPI,
    DI,
    IRI, // IRInew,
    Mu,
    Enrg ]

interface YearMonth  {
    year: number
    month: number
}

interface RoadData {
    success: boolean;
    road_name: string;
    road_distance: number;
    road: Array<{
        lat: number;
        lon: number;
        distance: number;
        IRI: number | null;
        E_norm: number | null;
        KPI: number | null;
        Mu: number | null;
        DI: number | null;
    }>;
}


interface DateRange {
    start?: YearMonth
    end?: YearMonth
}

const lessOrEqualThan = ( yearMonth1: YearMonth, yearMonth2: YearMonth): boolean => {
    if (yearMonth1.year < yearMonth2.year) {
        return true
    } else if ( yearMonth1.year > yearMonth2.year) {
        return false
    } else {
        return yearMonth1.month <= yearMonth2.month
    }
}

const noMonth = (dateRange: DateRange): number => {
    if (dateRange.start === undefined || dateRange.end === undefined) {
        return NaN
    } else {
        if (!lessOrEqualThan(dateRange.start, dateRange.end)) {
            return NaN
        } else {
            return (dateRange.end.year - dateRange.start.year) * 12 + dateRange.end.month - dateRange.start.month
        }
    }
}

const noToYearMonth = (no:number, dateRange: DateRange): YearMonth | undefined => {
    if (dateRange.start !== undefined) {
        const month = dateRange.start.month + no;
        const normalizedMonth = (month - 1) % 12 + 1
        const years = Math.floor((month - 1) / 12)
        return { year: dateRange.start.year + years, month: normalizedMonth}
    }
}

const yearMonthtoText = (yearMonth: YearMonth | undefined): string => {
    if (yearMonth === undefined) {
        return "??/??"
    }
    return yearMonth.month.toString() + "/" + yearMonth.year.toString().substring(2)
}

const getTypeColor = ( type: string ) : string => {
    switch ( type ) {
        case KPI: return "red"

        case DI : return "green"

        case IRI:
        case IRInew: return "yellow"

        case Mu: return "cyan"

        case Enrg: return "magenta"

        default: return "grey"
    }
}
const green = "#09BD09" //"#00FF00"
const greenyellow = "#02FC02" // "#BFFF00"
const yellow = "#FFFF00"
const orange = "#FFBF00"
const red = "#FF0000"
const cyan = "#00AACC"
const magenta = "#CC00CC"

const getConditionColor = ( properties: GeoJSON.GeoJsonProperties) : string => {
    if (properties !== null) {
        const type = properties.type;
        const value = properties.value;


        if (type !== undefined && type !== "ALL") {
            // if (motorway === undefined || !motorway) {
            // gradient for municpality roads
            switch (type) {
                case KPI:
                    return value <= 4.0 ? green : (value <= 6.0 ? greenyellow : (value <= 7.0 ? yellow : (value <= 8.0 ? orange : red )))
                case DI:
                    return value <= 1.2 ? green : (value <= 1.5 ? greenyellow : (value <= 2.0 ? yellow : (value <= 2.5 ? orange : red )))
                case IRI:
                case IRInew:
                    return value <= 1.5 ? green : (value <= 2.5 ? yellow : red)
                case Mu:
                    return value >= 0.8 ? green : (value >= 0.5 ? greenyellow : (value >= 0.3 ? yellow : (value >= 0.2 ? orange : red )))
                case Enrg:
                    return value <= 0.05 ? green : (value <= 0.1 ? greenyellow : (value <= 0.15 ? yellow : (value <= 0.25 ? orange : red )))
            }
        }
    }
    return "grey"
}

const ConditionMap = (props: any) => {
    const { children } = props;
    let selectedRoadData = {} as JSON;
    const { setData } = useData();
    const { setMap } = useData();

    const { center, zoom, minZoom, maxZoom, scaleWidth } = MAP_OPTIONS;

    const geoJsonRef = useRef<any>();

    const [dataAll, setDataAll] = useState<FeatureCollection>();
    const [rangeAll, setRangeAll] = useState<DateRange>({});
    const [rangeSelected, setRangeSelected] = useState<DateRange>({});
    const [mode, setMode] = useState<string>("NONE");
    const [pictureRoadPath, setPictureRoadPath] = useState<GeoJSON.MultiLineString>()
    const [isImagePageHidden, setIsImagePageHidden] = useState<boolean>(true);
    const [img, setImg] = useState<Blob>();

    const inputChange = ({ target }: any) => {
        setMode(target.value);
    };

    const rangeChange = (values: number[]) => {
        if (values.length === 2) {
            const newSelectedRange: DateRange = {
                start: noToYearMonth(values[0], rangeAll),
                end: noToYearMonth(values[1], rangeAll),
            };
            setRangeSelected(newSelectedRange);
        }
    };


    useEffect( () => {
        get('/conditions', (data: FeatureCollection) => {
            const range: DateRange = {}
            data.features.forEach((f) => {
                if (f.properties !== null && f.properties.valid_time !== undefined) {
                    const date = new Date(f.properties.valid_time)
                    const yearMonth: YearMonth = {
                        year: date.getFullYear(),
                        month:  date.getMonth() + 1
                    }
                    f.properties.valid_yearmonth = yearMonth
                    if (range.start === undefined ) {
                        range.start = yearMonth
                    } else if ( !lessOrEqualThan(range.start,yearMonth)) {
                        range.start = yearMonth
                    }
                    if (range.end === undefined ) {
                        range.end = yearMonth
                    } else if ( !lessOrEqualThan(yearMonth, range.end)) {
                        range.end = yearMonth
                    }
                }
            })
            setRangeAll(range)
            setDataAll(data)
        })
    }, [] )

    useEffect(() => {
        get('/conditions/road-pictures-path', (sectionGeom: GeoJSON.MultiLineString) => {
            setPictureRoadPath(sectionGeom);
        })
    }, []);

    useEffect ( () => {

        const setConditions = (data: FeatureCollection) => {
            if (geoJsonRef !== undefined && geoJsonRef.current !== undefined) {
                geoJsonRef.current.clearLayers()
                geoJsonRef.current.addData(data)
                geoJsonRef.current.setStyle(style)
            }
        }

        const style = (feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> | undefined) : PathOptions => {
            const mapStyle: PathOptions = {
                weight: 4,
                opacity: 1,
                color: 'grey',
                // fillcolor: 'red',
                // fillOpacity: 0.7
            }

            if ( feature !== undefined && feature.properties !== null && feature.properties.type !== undefined ) {
                if (mode === "ALL") {
                    mapStyle.color = getTypeColor(feature.properties.type)
                    mapStyle.opacity = 0.5
                    switch (feature.properties.type) {
                        case KPI: mapStyle.dashArray = '12 12'
                            break
                        case DI: mapStyle.dashArray = '20 20'
                            break
                        case IRI:
                        case IRInew: mapStyle.dashArray = '28 28'
                            break
                        case Mu: mapStyle.dashArray = '15 15'
                            break
                        case Enrg: mapStyle.dashArray = '22 22'
                    }
                } else if (feature.properties.value !== undefined) {
                    mapStyle.color = getConditionColor(feature.properties)
                }
            }

            return mapStyle
        }

        if (mode === NONE) {
            if (geoJsonRef !== undefined && geoJsonRef.current !== undefined) {
                geoJsonRef.current.clearLayers(); // This will clear any existing layers
            }
            return; // Exit the useEffect
        }

        if (mode === "ALL") {
            if (dataAll !== undefined) {
                const featureCollection: FeatureCollection = {
                    type: "FeatureCollection",
                    features:
                        dataAll.features !== undefined ?
                            dataAll.features.filter(
                                f => (
                                    f.properties !== null &&
                                    ( f.properties.valid_yearmonth === undefined ||
                                        ( (rangeSelected.start === undefined || lessOrEqualThan(rangeSelected.start,f.properties.valid_yearmonth)) &&
                                            (rangeSelected.end === undefined || lessOrEqualThan(f.properties.valid_yearmonth,rangeSelected.end))))
                                )
                            ) :
                            []
                }
                setConditions(featureCollection)
            }
        } else {
            const featureCollection: FeatureCollection = {
                type: "FeatureCollection",
                features: dataAll !== undefined ?
                    (dataAll.features !== undefined ?
                            dataAll.features.filter(
                                f => (
                                    f.properties !== null && f.properties.type === mode &&
                                    ( f.properties.valid_yearmonth === undefined ||
                                        ((rangeSelected.start === undefined || lessOrEqualThan(rangeSelected.start, f.properties.valid_yearmonth)) &&
                                            (rangeSelected.end === undefined || lessOrEqualThan(f.properties.valid_yearmonth, rangeSelected.end))))
                                )) :
                            []
                    ) : []
            }
            setConditions(featureCollection)
        }
    }, [dataAll, mode, rangeAll, rangeSelected])

    const roadHighlightLayerGroup = new L.LayerGroup();
    const onEachFeature = (feature: Feature, layer: Layer) => {
        if (feature !== undefined && feature.properties !== null && feature.properties.id !== undefined && feature.properties.value !== undefined) {
            layer.on('click', (e) => {
                if (feature.properties) {

                    roadHighlightLayerGroup.clearLayers();

                    const roadName = feature.properties.way_name;

                    if (dataAll && dataAll.features) {
                        const roadFeatures = dataAll.features.filter((f) =>
                            f.properties !== null && f.properties.way_name === roadName);


                        roadFeatures.forEach((roadFeature) => {
                            const roadHighlight = new L.GeoJSON(roadFeature.geometry, {
                                style: {
                                    weight: 8,
                                    color: 'blue',
                                    opacity: 0.3,
                                },
                            });
                            roadHighlightLayerGroup.addLayer(roadHighlight);
                        });

                        roadHighlightLayerGroup.addTo(e.target._map);

                        get(`/conditions/road_data?coverage_value_id=${feature.properties.id}`, (data: RoadData) => {
                            if (data.success) {
                                setData(data);
                            }
                            console.log(data);
                        });
                    }
                }
            });
        }
    };


    const handlePictureRoadClick = (e: LeafletMouseEvent) => {
        get(`/conditions/picture/${e.latlng.lat}/${e.latlng.lng}`, (img: File) => {
            setImg(img);
        })
        setIsImagePageHidden(false);
    }

    const onPictureRoadClick = (feature: Feature,  layer: Layer) => {
        if (layer !== undefined) {
            layer.on({
                click: event => handlePictureRoadClick(event)
            }
        );}
    }

    const handleConditionToggle = (condition: string | null, isSelected: boolean) => {
        if (condition === null) {
            // Handle the null case appropriately.
            return;
        }
        if (isSelected) {
            setMode(condition); // Select the condition "X"
        } else {
            setMode(NONE); // Deselected - return to ALL
        }
    };

    const MapInstanceComponent = () => {
        const map = useMap();
        useEffect(() => {
            if (map) {
                console.log("Setting map instance");
                setMap(map);
            }
        }, [map, setMap]);

        return null;
    };



    return (
        <div style={{ height: "100%" }}>

            <div className="condition-toggle-buttons-container">
                <ConditionToggleButtons
                    conditionTypes={conditionTypes}
                    onConditionToggle={handleConditionToggle}/>
            </div>
            <div className="image-container" hidden={isImagePageHidden}>
            </div>
            <div>
                <MapContainer
                    preferCanvas={true}
                    center={center}
                    zoom={zoom}
                    minZoom={minZoom}
                    maxZoom={maxZoom}
                    scrollWheelZoom={true}
                    zoomControl={false}
                >
                    <MapInstanceComponent/>
                    <TileLayer
                        maxNativeZoom={maxZoom}
                        maxZoom={maxZoom}
                        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {//{ pictureRoadPath !== undefined &&
                    //<GeoJSON ref={geoJsonRef} data={pictureRoadPath} onEachFeature={onPictureRoadClick} />}
                    }
                    { dataAll !== undefined &&
                        <GeoJSON ref={geoJsonRef} data={dataAll} onEachFeature={onEachFeature} /> }

                    <Zoom />
                    <ScaleControl imperial={false} position="bottomleft" maxWidth={scaleWidth} />
                    {children}
                </MapContainer>
            </div>
            {mode == "ALL" && (
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", color: "white" }}>
                    Colors indicate what condition is displayed &nbsp;
                    <span style={{ color: red }}>KPI </span>&nbsp;
                    <span style={{ color: green }}>DI </span>&nbsp;
                    <span style={{ color: yellow }}>IRI </span>&nbsp;
                    <span style={{ color: cyan }}>{muSymbol} </span>&nbsp;
                    <span style={{ color: magenta }}>E</span>
                </div>
            )}
            {mode !== "ALL" && (
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", color: "white" }}>
                    Colors indicate condition values from &nbsp;
                    <span style={{ color: green }}>green (good)</span>&nbsp;
                    <span style={{ color: greenyellow }}>over</span>&nbsp;
                    <span style={{ color: yellow }}>yellow (medium)</span>&nbsp;
                    <span style={{ color: orange }}>to</span>&nbsp;
                    <span style={{ color: red }}>red (bad)</span>
                </div>
            )}
        </div>
    );
};

export default ConditionMap