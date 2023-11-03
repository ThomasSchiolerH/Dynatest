import {MapContainer, ScaleControl, TileLayer} from "react-leaflet";
import Zoom from "../map/zoom";
import React, { useState,PureComponent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts'
import ToggleSwitch from './ToggleSwitch'; // Update the path to the ToggleSwitch component


interface ConditionToggleButtonsProps {
    conditionTypes: string[]; // Define the type of conditionTypes prop
    onConditionToggle: (condition: string | null, isSelected: boolean) => void;
}

const ConditionToggleButtons: React.FC<ConditionToggleButtonsProps> = ({ conditionTypes, onConditionToggle }) => {
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [isDataWindowVisible, setIsDataWindowVisible] = useState<boolean>(false);

    const toggleCondition = (condition: string) => {
        setSelectedConditions(prevConditions => {
            let updatedConditions: string[];
            if (prevConditions.includes(condition)) {
                updatedConditions = prevConditions.filter(cond => cond !== condition);
            } else {
                updatedConditions = [...prevConditions, condition];
            }

            // Notify the parent component of the highest priority condition
            const highestPriorityCondition = getHighestPriorityConditionFromList(updatedConditions);
            onConditionToggle(highestPriorityCondition, highestPriorityCondition !== null && updatedConditions.includes(highestPriorityCondition));


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


    const toggleDataWindow = () => {
        setIsDataWindowVisible((prev) => !prev);
    };

    const data = [
        {
            name: '15173',
            KPI: 4.75,
            DI: 1.19,
            IRI: 1.42,
        },
        {
            name: '16090',
            KPI: 6.30,
            DI: 2.18,
            IRI: 1.90,
        },
        {
            name: '16025',
            KPI: 4.73,
            DI: 1.19,
            IRI: 1.36,
        },
        {
            name: '15935',
            KPI: 4.78,
            DI: 1.59,
            IRI: 1.36,
        },
        {
            name: '16025',
            KPI: 6.05,
            DI: 2.01,
            IRI: 1.05,
        },
        {
            name: '15935',
            KPI: 4.66,
            DI: 1.44,
            IRI: 1.05,
        },
    ];

    return (
        <div className="condition-toggle-buttons-container">
            <div className="condition-toggle-buttons">
                <div className="DataWindowSwitch">
                    <ToggleSwitch isDataWindowVisible={isDataWindowVisible} toggleDataWindow={toggleDataWindow} label={"Data"} />
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
                <div className="data-window" style={{width: '50%'}}>
                    <div className="data-window-content"
                         style={{ paddingTop: '0px',
                        paddingBottom: '70px',
                        paddingLeft: '0px',
                        paddingRight: '30px' }}>
                        <div className={"chart-container"}>
                            <h4>Graph 1 with data type KPI:</h4>
                            <ResponsiveContainer width="100%" height={230}>
                                <LineChart
                                    width={500}
                                    height={200}
                                    data={data}
                                    syncId="anyId"
                                    margin={{
                                        top: 10,
                                        right: 30,
                                        left: 0,
                                        bottom: 30,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" stroke={"white"} label={{ value: 'Trip-id', angle: 0, position: 'bottom' }}/>
                                    <YAxis stroke={"white"} label={{ value: 'Value', angle: -90, position: 'insideLeft' }}/>
                                    <Tooltip />
                                    <Line type="linear" dataKey="KPI" stroke="#8884d8" fill="#8884d8" />
                                </LineChart>
                            </ResponsiveContainer>
                            <h4>Zoom graph with data type DI:</h4>

                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart
                                    width={500}
                                    height={200}
                                    data={data}
                                    syncId="anyId"
                                    margin={{
                                        top: 40,
                                        right: 30,
                                        left: 0,
                                        bottom: 30,
                                    }}
                                >

                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" stroke={"white"} label={{ value: 'Trip-id', angle: 0, position: 'bottom' }}/>
                                    <YAxis stroke={"white"} label={{ value: 'Value', angle: -90, position: 'insideLeft' }}/>
                                    <Tooltip />
                                    <Brush y={5} height={20} />
                                    <Line type="linear" dataKey="DI" stroke="#82ca9d" fill="#82ca9d" />

                                </LineChart>
                            </ResponsiveContainer>
                            <h4>Graph with data type IRI:</h4>

                            <ResponsiveContainer width="100%" height={230}>
                                <AreaChart
                                    width={500}
                                    height={200}
                                    data={data}
                                    syncId="anyId"
                                    margin={{
                                        top: 10,
                                        right: 30,
                                        left: 0,
                                        bottom: 30,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" stroke={"white"} label={{ value: 'Trip-id', angle: 0, position: 'bottom' }}/>
                                    <YAxis stroke={"white"} label={{ value: 'Value', angle: -90, position: 'insideLeft' }}/>
                                    <Tooltip />
                                    <Area type="linear" dataKey="IRI" stroke="#82ca9d" fill="#82ca9d" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default ConditionToggleButtons;
