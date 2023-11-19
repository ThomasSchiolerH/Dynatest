import {MapContainer, ScaleControl, TileLayer} from "react-leaflet";
import Zoom from "../map/zoom";
import React, {useState, PureComponent, useEffect} from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts'
import ToggleSwitch from './ToggleSwitch'; // Update the path to the ToggleSwitch component
import PhotoScrollComponent from "./PhotoScrollComponent";
import DataWindowImg from '../images/DataWindowImg.png';
import SingleConditionToggledImg from '../images/singleConditionToggledImg.png';
import MultipleConditionsToggledImg from '../images/multipleConditionsToggledImg.png';
import { useData } from "../context/RoadDataContext";
import {ALL} from "dns";


interface ConditionToggleButtonsProps {
    conditionTypes: string[]; // Define the type of conditionTypes prop
    onConditionToggle: (condition: string | null, isSelected: boolean) => void;
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


const ConditionToggleButtons: React.FC<ConditionToggleButtonsProps> = ({ conditionTypes, onConditionToggle}) => {
    //data from pressed road segment
    let {data} = useData();
    const [graphData, setGraphData] = useState<Record<string, any>[]>([]);
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [isDataWindowVisible, setIsDataWindowVisible] = useState<boolean>(false);

    //method to update graph data
    useEffect(() => {
        if (data) {
            const newData = convertIntoGraphData(data);
            setGraphData(newData || []); // Use an empty array as the default value if newData is undefined
            console.log(newData);
        }
    }, [data]);

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

            return updatedConditions;
        });
    };


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

            if (data) {
                data.road.forEach((roadItem) => {
                    const graphItem: Record<string, any> = {
                        name: roadItem.distance,
                        KPI: roadItem.KPI !== null ? roadItem.KPI.toPrecision(3) : null,
                        DI: roadItem.DI !== null ? roadItem.DI.toPrecision(3) : null,
                        IRI: roadItem.IRI !== null ? roadItem.IRI.toPrecision(3) : null,
                        Mu: roadItem.Mu !== null ? roadItem.Mu.toPrecision(3) : null,
                        E_norm: roadItem.E_norm !== null ? roadItem.E_norm.toPrecision(3) : null,
                    };

                    graphData.push(graphItem);
                });
            }

            return graphData;
        }
    }

    const toggleDataWindow = () => {
        setIsDataWindowVisible((prev) => !prev);
    };

    type ConditionColors = {
        [key in typeof conditionTypes[number]]: string;
    };


    const conditionColors: ConditionColors = {
        KPI: "#FF5733",
        DI: "#33FF57",
        IRI: "#397eff",
        Mu: "#FF33E2",
        E_norm: "#9eb626"
    };

    const renderLineCharts = () => {
        return selectedConditions.map((dataType) => (
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
                        <Brush dataKey="name" height={30} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        ));
    };

    const [imageUrls, setImageUrls] = useState<string[]>([]);

    useEffect(() => {
        // Fetch the initial image URLs on component mount
        // Here you need to define how you determine the initial set of images
        const initialSetOfImages = getInitialSetOfImages();
        setImageUrls(initialSetOfImages);
    }, []);

    const getInitialSetOfImages = (): string[] => {
        // You would fetch or define the initial URLs here
        return [
            // Note, you have to import the images for them to be displayed?
            DataWindowImg, //Place holder
            SingleConditionToggledImg,//Place holder
            DataWindowImg,//Place holder
            SingleConditionToggledImg,//Place holder
            DataWindowImg,//Place holder
            MultipleConditionsToggledImg,//Place holder
            DataWindowImg,//Place holder
            // ... other image URLs
        ];
    };

    const fetchAdjacentImages = async (direction: 'left' | 'right', index: number): Promise<string[]> => {
        // Implement the logic to fetch new images based on the direction and the index
        // Make an API call to your backend and pass parameters
        // Here you would return the result of that call
        // For now it returns an empty array as a placeholder

        //POSSIBLE IMPLEMENTATION BELOW?
        // try {
        //     const response = await fetch(`/api/images?direction=${direction}&startIndex=${index}`);
        //     if (response.ok) {
        //         const images = await response.json();
        //         return images;
        //     } else {
        //         // Handle errors, for example, if the response is not OK:
        //         console.error('Failed to fetch images:', response.statusText);
        //         return [];
        //     }
        // } catch (error) {
        //     console.error('Error fetching images:', error);
        //     return [];
        // }
        return [
            MultipleConditionsToggledImg,//Place holder
            DataWindowImg,//Place holder
            MultipleConditionsToggledImg,//Place holder
        ];
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

                {/* ToggleSwitch components for each condition type */}
                {conditionTypes.map((condition) => {
                    const isHighestPriority = condition === getHighestPriorityConditionFromList(selectedConditions);
                    return (
                        <ToggleSwitch
                            key={condition}
                            isDataWindowVisible={selectedConditions.includes(condition)}
                            toggleDataWindow={() => toggleCondition(condition)}
                            label={condition}
                            isHighestPriority={isHighestPriority}
                        />
                    );
                })}
            </div>
            {isDataWindowVisible && (
                <div className="data-window" style={{width: '40%'}}>
                    <div className="data-window-content">
                        <PhotoScrollComponent
                            imageUrls={imageUrls}
                            fetchAdjacentImages={fetchAdjacentImages}
                        />
                        {renderLineCharts()}
                    </div>
                </div>
            )}

        </div>

    );
};
export default ConditionToggleButtons;
