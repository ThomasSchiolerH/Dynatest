import {MapContainer, ScaleControl, TileLayer} from "react-leaflet";
import Zoom from "../map/zoom";
import React, { useState,PureComponent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts'


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
            name: 'Page A',
            KPI: 4000,
            DI: 2400,
            IRI: 2400,
        },
        {
            name: 'Page B',
            KPI: 3000,
            DI: 1398,
            IRI: 2210,
        },
        {
            name: 'Page C',
            KPI: 2000,
            DI: 9800,
            IRI: 2290,
        },
        {
            name: 'Page D',
            KPI: 2780,
            DI: 3908,
            IRI: 2000,
        },
        {
            name: 'Page E',
            KPI: 1890,
            DI: 4800,
            IRI: 2181,
        },
        {
            name: 'Page F',
            KPI: 2390,
            DI: 3800,
            IRI: 2500,
        },
        {
            name: 'Page G',
            KPI: 3490,
            DI: 4300,
            IRI: 2100,
        },
    ];

    return (
        <div className="condition-toggle-buttons-container">
            <div className="condition-toggle-buttons">
                <div
                    className={`data-window-button ${isDataWindowVisible ? 'active' : ''}`}
                    onClick={toggleDataWindow}
                >
                    Data Window
                    <span className="toggle-icon">{isDataWindowVisible ? '✓' : '✖'}</span>
                </div>
                {conditionTypes.map((condition) => (
                    <div
                        key={condition}
                        className={`condition-toggle-button ${selectedConditions.includes(condition) ? 'active' : ''}`}
                        onClick={() => toggleCondition(condition)}
                    >
                        {condition}
                        <span className="toggle-icon">{selectedConditions.includes(condition) ? '✓' : '✖'}</span>
                    </div>
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
                            <h4>Graph 1 with data type 1:</h4>
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
                                    <XAxis dataKey="name" stroke={"white"} label={{ value: 'Distance', angle: 0, position: 'bottom' }}/>
                                    <YAxis stroke={"white"} label={{ value: 'Value', angle: -90, position: 'insideLeft' }}/>
                                    <Tooltip />
                                    <Line type="linear" dataKey="KPI" stroke="#8884d8" fill="#8884d8" />
                                </LineChart>
                            </ResponsiveContainer>
                            <h4>Zoom graph with data type 2:</h4>

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
                                    <XAxis dataKey="name" stroke={"white"} label={{ value: 'Distance', angle: 0, position: 'bottom' }}/>
                                    <YAxis stroke={"white"} label={{ value: 'Value', angle: -90, position: 'insideLeft' }}/>
                                    <Tooltip />
                                    <Brush y={5} height={20} />
                                    <Line type="linear" dataKey="DI" stroke="#82ca9d" fill="#82ca9d" />

                                </LineChart>
                            </ResponsiveContainer>
                            <h4>Graph with data type 3:</h4>

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
                                    <XAxis dataKey="name" stroke={"white"} label={{ value: 'Distance', angle: 0, position: 'bottom' }}/>
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
