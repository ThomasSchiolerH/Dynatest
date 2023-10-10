import React, { useState } from 'react';

interface ConditionToggleButtonsProps {
    conditionTypes: string[];
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
                    {/* Your data window content goes here */}
                </div>
            )}
        </div>
    );
};
    export default ConditionToggleButtons;
