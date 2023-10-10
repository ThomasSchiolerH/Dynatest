import {MapContainer, ScaleControl, TileLayer} from "react-leaflet";
import Zoom from "../map/zoom";
import React, { useState,PureComponent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, AreaChart, Area, ResponsiveContainer } from 'recharts'


interface ConditionToggleButtonsProps {
    conditionTypes: string[]; // Define the type of conditionTypes prop
    onConditionToggle: (condition: string, isSelected: boolean) => void;
}

const ConditionToggleButtons: React.FC<ConditionToggleButtonsProps> = ({ conditionTypes, onConditionToggle }) => {
    const [selectedConditions, setSelectedConditions] = useState<{ [key: string]: boolean }>({});
    const [isDataWindowVisible, setIsDataWindowVisible] = useState<boolean>(false);

    const toggleCondition = (condition: string) => {
        const updatedConditions = {...selectedConditions};
        updatedConditions[condition] = !updatedConditions[condition];
        setSelectedConditions(updatedConditions);
        onConditionToggle(condition, updatedConditions[condition]);
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
                        className={`condition-toggle-button ${selectedConditions[condition] ? 'active' : ''}`}
                        onClick={() => toggleCondition(condition)}
                    >
                        {condition}
                        <span className="toggle-icon">{selectedConditions[condition] ? '✓' : '✖'}</span>
                    </div>
                ))}
            </div>
            {isDataWindowVisible && (
                <div className="data-window" style={{width: '50%'}}>
                    <div className="data-window-content">
                        <p>Data Window Content</p>
                        <div className={"chart-container"}>
                            <h4>Graph 1 with data type 1:</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart
                                    width={500}
                                    height={200}
                                    data={data}
                                    syncId="anyId"
                                    margin={{
                                        top: 10,
                                        right: 30,
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="KPI" stroke="#8884d8" fill="#8884d8" />
                                </LineChart>
                            </ResponsiveContainer>
                            <h4>Zoom graph with data type 2:</h4>

                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart
                                    width={500}
                                    height={200}
                                    data={data}
                                    syncId="anyId"
                                    margin={{
                                        top: 10,
                                        right: 30,
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="DI" stroke="#82ca9d" fill="#82ca9d" />
                                    <Brush />
                                </LineChart>
                            </ResponsiveContainer>
                            <h4>Graph with data type 3:</h4>

                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart
                                    width={500}
                                    height={200}
                                    data={data}
                                    syncId="anyId"
                                    margin={{
                                        top: 10,
                                        right: 30,
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="IRI" stroke="#82ca9d" fill="#82ca9d" />
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
