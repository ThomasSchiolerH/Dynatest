import React from 'react';
import "../css/DataWindow.css";

/**
 * @author Thomas Schioler Hansen (s214968) & Alexander Vaaben s(214958)
 * @interface
 * */
interface ToggleSwitchProps {
    isDataWindowVisible: boolean;
    toggleDataWindow: () => void;
    label: string;
    isHighestPriority: boolean; // New prop to indicate highest priority
}
/**
 * @author Thomas Schioler Hansen (s214968) & Alexander Vaaben s(214958)
 * @param {boolean} isDataWindowVisible - Determines if the data window is currently visible.
 * @param {Function} toggleDataWindow - Function to call when the toggle is interacted with.
 * @param {string} label - The label text to display on the toggle.
 * @param {boolean} isHighestPriority - Determines the color of the toggle (green for true, grey for false).
 * @output {JSX.Element} - Returns a JSX element representing the toggle switch.
 * */
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
