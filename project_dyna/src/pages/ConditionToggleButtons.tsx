import React, { useState } from 'react';

interface ConditionToggleButtonsProps {
    conditionTypes: string[]; // Define the type of conditionTypes prop
    onConditionToggle: (condition: string, isSelected: boolean) => void;
}

const ConditionToggleButtons: React.FC<ConditionToggleButtonsProps> = ({ conditionTypes, onConditionToggle }) => {
    const [selectedConditions, setSelectedConditions] = useState<{ [key: string]: boolean }>({});

    const toggleCondition = (condition: string) => {
        const updatedConditions = { ...selectedConditions };
        updatedConditions[condition] = !updatedConditions[condition];
        setSelectedConditions(updatedConditions);
        onConditionToggle(condition, updatedConditions[condition]);
    };

    return (
        <div className="condition-toggle-buttons">
            {conditionTypes.map((condition) => (
                <div
                    key={condition}
                    className={`condition-toggle-button ${selectedConditions[condition] ? 'active' : ''}`}
                    onClick={() => toggleCondition(condition)}
                >
                    {condition}
                    {selectedConditions[condition] ? (
                        <span className="toggle-icon">✓</span>
                    ) : (
                        <span className="toggle-icon">❌</span>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ConditionToggleButtons;
