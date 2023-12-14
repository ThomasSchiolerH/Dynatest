import React from 'react';
import "../css/DataWindow.css";

interface ToggleSwitchProps {
    isDataWindowVisible: boolean;
    toggleDataWindow: () => void;
    label: string;
    isHighestPriority: boolean; // New prop to indicate highest priority
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isDataWindowVisible, toggleDataWindow, label, isHighestPriority }) => {
    return (
        <label className={`switch ${isDataWindowVisible ? (isHighestPriority ? 'green' : 'grey') : ''}`}>
            <input type="checkbox" checked={isDataWindowVisible} onChange={toggleDataWindow} />
            <span className="slider">
                <span className={`text on ${isDataWindowVisible ? 'active' : ''}`}>{label}</span>
                <span className={`text off ${!isDataWindowVisible ? 'active' : ''}`}>{label}</span>
            </span>
        </label>
    );
};

export default ToggleSwitch;