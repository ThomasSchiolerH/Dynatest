import React from 'react';
import "../css/DataWindow.css";

interface ToggleSwitchProps {
    isDataWindowVisible: boolean;
    toggleDataWindow: () => void;
    label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isDataWindowVisible, toggleDataWindow, label }) => {
    return (
        <label className={`switch ${isDataWindowVisible ? 'checked' : ''}`}>
            <input type="checkbox" checked={isDataWindowVisible} onChange={toggleDataWindow} />
            <span className="slider">
        <span className={`text on ${isDataWindowVisible ? 'active' : ''}`}>{label}</span>
        <span className={`text off ${!isDataWindowVisible ? 'active' : ''}`}>{label}</span>
      </span>
        </label>
    );
};

export default ToggleSwitch;
