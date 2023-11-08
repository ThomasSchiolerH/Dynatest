import {MapContainer, ScaleControl, TileLayer} from "react-leaflet";
import Zoom from "../map/zoom";
import React, {useState, PureComponent, useEffect} from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts'
import ToggleSwitch from './ToggleSwitch'; // Update the path to the ToggleSwitch component
import { useData } from "../context/RoadDataContext";


interface ConditionToggleButtonsProps {
    conditionTypes: string[]; // Define the type of conditionTypes prop
    onConditionToggle: (condition: string | null, isSelected: boolean) => void;
}

interface RoadData {
    success: boolean;
    way_name: string;
    is_highway: boolean;
    section_geom: string;
    coverage: {
        [key: string]: number[];
    };
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
                ? getHighestPriorityConditionFromList(updatedConditions)
                : "NONE"; // If no conditions are selected, we use "NONE"
            // Notify the parent component
            onConditionToggle(stateToSend, stateToSend !== "NONE");

            return updatedConditions;
        });
    };


    const getHighestPriorityCondition = () => {
        for (let condition of conditionTypes) {
            if (selectedConditions.includes(condition)) {
                return condition;  // Return the first match which has the highest priority
            }
        }
        return null;
    };

    const highestPriorityCondition = getHighestPriorityCondition();

    const getHighestPriorityConditionFromList = (conditionsList: string[]) => {
        for (let condition of conditionTypes) {
            if (conditionsList.includes(condition)) {
                return condition;
            }
        }
        return null;
    };


    function convertIntoGraphData(data: RoadData | null) {
        if (data) {
            const exportData = [];

            for (let i = 0; i < 7; i++) {
                const dataPoint: Record<string, any> = {
                    name: "Way " + i,
                };
                conditionTypes.forEach((condition) => {
                    const value = data.coverage[condition][i];
                    dataPoint[condition] = value !== null ? value.toPrecision(3) : null;
                });
                exportData.push(dataPoint);
            }
            return exportData;
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
                <h4>Graph with data type {dataType}:</h4>
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
                        <XAxis dataKey="name" stroke="white" label={{ value: 'Way segments', angle: 0, position: 'bottom' }} />
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


    return (
        <div className="condition-toggle-buttons-container">
            <div className="condition-toggle-buttons">
                <div className="DataWindowSwitch">
                    <ToggleSwitch isDataWindowVisible={isDataWindowVisible} toggleDataWindow={toggleDataWindow}
                                  label={'Data'}/>
                </div>
                {conditionTypes.map((condition) => (
                    <ToggleSwitch
                        key={condition}
                        isDataWindowVisible={selectedConditions.includes(condition)}
                        toggleDataWindow={() => toggleCondition(condition)}
                        label={condition}
                    />
                ))}
            </div>
            {isDataWindowVisible && (
                <div className="data-window" style={{width: '40%'}}>
                    <div className="data-window-content">
                        {renderLineCharts()}
                    </div>
                </div>
            )}

        </div>

    );
};
export default ConditionToggleButtons;
