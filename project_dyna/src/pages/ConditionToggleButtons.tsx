import {MapContainer, ScaleControl, TileLayer} from "react-leaflet";
import Zoom from "../map/zoom";
import React, {useState, PureComponent, useEffect, useRef} from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts'
import ToggleSwitch from '../Components/ToggleSwitch'; // Update the path to the ToggleSwitch component
import PhotoScrollComponent from "../Components/PhotoScrollComponent";
import DataWindowImg from '../images/DataWindowImg.png';
import SingleConditionToggledImg from '../images/singleConditionToggledImg.png';
import MultipleConditionsToggledImg from '../images/multipleConditionsToggledImg.png';
import { useData } from "../context/RoadDataContext";
import {ALL} from "dns";
import L, {LatLng} from "leaflet";
import {DomUtil} from "leaflet";
import empty = DomUtil.empty;
import "../css/DataWindow.css";
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';



interface ConditionToggleButtonsProps {
    conditionTypes: string[]; // Define the type of conditionTypes prop
    onConditionToggle: (condition: string | null, isSelected: boolean) => void;
    markerPosition: LatLng | null;
}

interface Geometry {
    type: string;
    coordinates: Array<Array<[number, number]>>;
}

interface RoadData {
    success: boolean;
    road_name: string;
    road_distance: number;
    initial_distance: number;
    road_geometry: Geometry;
    road: Array<{
        lat: number;
        lon: number;
        distance: number;
        IRI: number | null;
        E_norm: number | null;
        KPI: number | null;
        Mu: number | null;
        DI: number | null;
        //source: string | null;
    }>;
    pictures: Array<{
        distance: number;
        Image3D: string | null;
        ImageInt: string | null;
        ImageRng: string | null;
        Overlay3D: string | null;
        OverlayInt: string | null;
        OverlayRng: string | null;
    }>;
}

interface PhotoStripProps {
    pictures: RoadData['pictures'];
}


const ConditionToggleButtons: React.FC<ConditionToggleButtonsProps> = ({ conditionTypes, onConditionToggle, markerPosition}) => {
    //data from pressed road segment
    let {data} = useData();
    const [graphData, setGraphData] = useState<Record<string, any>[]>([]);
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [isDataWindowVisible, setIsDataWindowVisible] = useState<boolean>(false);
    const { map } = useData();
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [widthPercentage, setWidthPercentage] = useState<number>(40);
    const [isResizing, setIsResizing] = useState(false);
    const [correspondingDataPoint, setCorrespondingDataPoint] = useState<number | null>(null);
    const { roadHighlightLayerGroup } = useData();

    const increaseWidth = () => {
        setWidthPercentage((prevWidth) => Math.min(prevWidth + 5, 100));
    };

    const decreaseWidth = () => {
        setWidthPercentage((prevWidth) => Math.max(prevWidth - 5, 10));
    };

    const toggleFullScreen = () => {
        setIsFullScreen(prev => !prev);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing) {
                setWidthPercentage((prevWidth) => {
                    const sensitivityFactor = 10;
                    const newWidth = Math.max(10, Math.min(prevWidth + e.movementX / sensitivityFactor, 100));
                    return newWidth;
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const PhotoStrip: React.FC<PhotoStripProps> = ({ pictures }) => {
        const stripRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (stripRef.current) {
                // Scroll to the end of the strip initially
                stripRef.current.scrollLeft = stripRef.current.scrollWidth;
            }
        }, [pictures]);

        return (
            <div className="photo-strip-container">
                <div className="photo-strip" ref={stripRef}>
                    {pictures.map((picture, index) => (
                        <div key={index} className="photo-item">
                            <img
                                src={`http://${picture.OverlayInt}`}
                                alt={`Picture ${index + 1}`}
                                className="photo-image"
                            />
                            <div className="distance-label">{`Distance: ${picture.distance}`}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };


    //method to update graph data
    useEffect(() => {
        if (data) {
            const newData = convertIntoGraphData(data);
            setGraphData(newData || []); // Use an empty array as the default value if newData is undefined
        }
    }, [data]);

    /**
     * @author Thomas Schioler Hansen (s214968)
     * */
    const toggleCondition = (condition: string) => {
        setSelectedConditions(prevConditions => {
            let updatedConditions: string[];

            if (prevConditions.includes(condition)) {
                updatedConditions = prevConditions.filter(cond => cond !== condition);
            } else {
                updatedConditions = [...prevConditions, condition];
            }

            // Determine the state to send to the parent component
            let stateToSend = updatedConditions.length > 0
                ? getHighestPriorityConditionFromList(updatedConditions) // If there is elements in updatedCondition then find priority
                : "NONE"; // If no conditions are selected, we use "NONE"
            // Notify the parent component
            onConditionToggle(stateToSend, stateToSend !== "NONE");


            if (updatedConditions.length === 0){
                roadHighlightLayerGroup?.clearLayers()
            }

            return updatedConditions;
        });

    };


    /**
     * @author Thomas Schioler Hansen (s214968)
     * */
    const getHighestPriorityConditionFromList = (conditionsList: string[]) => {
        for (let condition of conditionTypes) {
            if (conditionsList.includes(condition)) {
                return condition;
            }
        }
        return null;
    };


    function convertIntoGraphData(data: RoadData | undefined) {
        if (data) {
            const graphData: Array<Record<string, any>> = [];

            if (data.road.length > 0) {
                const expectedConditionTypes = ['KPI', 'DI', 'IRI', 'Mu', 'E_norm'];

                data.road.forEach((roadItem) => {
                    const graphItem: Record<string, any> = {
                        name: roadItem.distance,
                    };

                    expectedConditionTypes.forEach((conditionType) => {
                        if (roadItem.hasOwnProperty(conditionType as keyof typeof roadItem)) {
                            const conditionValue = roadItem[conditionType as keyof typeof roadItem];

                            graphItem[conditionType] =
                                conditionValue !== null ? conditionValue.toPrecision(3) : null;
                        } else {
                            graphItem[conditionType] = null;
                        }
                    });

                    graphData.push(graphItem);
                });
            }

            return graphData;
        }
    }

    /**
     * @author Thomas Schioler Hansen (s214968)
     * */
    const findClosestRoadItem = (clickLocation: LatLng, roadData: RoadData): typeof roadData.road[number] | null => {
        let closestRoadItem = null;
        let minDistance = Number.MAX_VALUE;

        roadData.road.forEach(roadItem => {
            const itemLatLng = L.latLng(roadItem.lat, roadItem.lon);
            const distance = itemLatLng.distanceTo(clickLocation);


            if (distance < minDistance) {
                minDistance = distance;
                closestRoadItem = roadItem;
            }
        });

        return closestRoadItem;
    };

    useEffect(() => {
        if (markerPosition && data) {
            const closestRoadItem = findClosestRoadItem(markerPosition, data);
            if (closestRoadItem !== null) {
                setCorrespondingDataPoint(closestRoadItem.distance);
            }
        }
    }, [markerPosition, data]);


    /**
     * @author Thomas Schioler Hansen (s214968)
     * */
    const toggleDataWindow = () => {
        setIsDataWindowVisible((prev) => !prev);

        if (!isDataWindowVisible && data && data.road.length > 0) {
            const firstPoint = data.road[0];
            const coordinates = { lat: firstPoint.lat, lon: firstPoint.lon };
            if (map) {
                const currentZoomLevel = map.getZoom();
                map.flyTo([coordinates.lat, coordinates.lon-0.008], currentZoomLevel);
            }
        }
    };

    type ConditionColors = {
        [key in typeof conditionTypes[number]]: string;
    };


    const conditionColors: ConditionColors = {
        KPI: "#FF5733",
        DI: "#33FF57",
        IRI: "#9eb626",
        Mu: "#397eff",
        E_norm: "#FF33E2"
    };

    const renderLineCharts = () => {
        return selectedConditions.map((dataType) => {
            if (dataType === "ALL") { // If dataType is "ALL", return nothing
                return;
            }
        return (
            <div className="chart-container" key={dataType}>
                <h4>{dataType} data from {data?.road_name}:</h4>
                <ResponsiveContainer width="100%" height={230}>
                    <LineChart
                        width={500}
                        height={200}
                        data={graphData}
                        syncId={`anyId`}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 30,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="white" label={{ value: 'Distance', angle: 0, position: 'top' }} />
                        <YAxis stroke="white" label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Line
                            type="linear"
                            dataKey={dataType}
                            stroke={conditionColors[dataType]}
                            fill={conditionColors[dataType]}
                            connectNulls={true}
                        />
                        {correspondingDataPoint != null && (
                            <ReferenceLine
                                x={correspondingDataPoint}
                                stroke="red"
                            />
                        )}
                        <Brush dataKey="name" height={30} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            );
    });
    };




    return (
        <div className="condition-toggle-buttons-container">
            <div className="condition-toggle-buttons">
                {/* DataWindowSwitch component */}
                <div className="DataWindowSwitch">
                    <ToggleSwitch
                        isDataWindowVisible={isDataWindowVisible}
                        toggleDataWindow={toggleDataWindow}
                        label={"Data"}
                        isHighestPriority={false} // Assuming this is not a condition and thus not a candidate for highest priority
                    />
                </div>
                {isDataWindowVisible && (
                    <div>
                        <button onClick={increaseWidth} className="custom-zoom-in-button">+</button>
                        <button onClick={decreaseWidth} className="custom-zoom-out-button">-</button>
                        <div className="FullScreenSwitch">
                            <ToggleSwitch
                                isDataWindowVisible={isFullScreen}
                                toggleDataWindow={toggleFullScreen}
                                label={"Full"}
                                isHighestPriority={false}
                            />
                        </div>
                    </div>
                )}

                {/* ToggleSwitch components for each condition type */}
                {conditionTypes.map((condition) => {
                    const isHighestPriority = condition === getHighestPriorityConditionFromList(selectedConditions);
                    const label = condition === "E_norm" ? "E" : condition;

                    return (
                        <ToggleSwitch
                            key={condition}
                            isDataWindowVisible={selectedConditions.includes(condition)}
                            toggleDataWindow={() => toggleCondition(condition)}
                            label={label}
                            isHighestPriority={isHighestPriority}
                        />
                    );
                })}
            </div>
            {isDataWindowVisible && (
                <div className="data-window" style={{ width: isFullScreen ? 'calc(100% - 120px)' : `${widthPercentage}%` }}>
                    <div className="resizable-bar" onMouseDown={() => setIsResizing(true)}
                         style={{
                             cursor: 'ew-resize',
                             height: '100%',
                             width: '10px',
                             background: 'var(--background-2)',
                             position: 'absolute',
                             right: 0,
                             top: 0,
                         }}
                    />
                    <div className="data-window-content">
                        <PhotoStrip pictures={data?.pictures || []} />
                        {renderLineCharts()}
                    </div>
                </div>
            )}

        </div>

    );
};
export default ConditionToggleButtons;
