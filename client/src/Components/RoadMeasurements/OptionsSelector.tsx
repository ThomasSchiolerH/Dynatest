import React, { FC } from "react";
import DatePicker from "react-date-picker";
import { TripsOptions } from "../../models/models";
import Checkbox from "../Checkbox";

import { MdClear } from "react-icons/md"

interface IOptionsSelector {
    options: TripsOptions
    setOptions: React.Dispatch<React.SetStateAction<TripsOptions>>;
    reset: () => void
}

const OptionsSelector: FC<IOptionsSelector> = ( { options, setOptions, reset } ) => {

    const _onChange = (key: keyof TripsOptions) => {
        return function<T>(value: T) 
        {
            const temp = { ...options } as any
            temp[key] = value
            setOptions(temp)
        }
    } 

    return (
        <div className="rides-options">
            <input 
                className="ride-search-input" 
                placeholder='Search..' 
                value={options.search} 
                onChange={e => _onChange('search')(e.target.value)} />

            <DatePicker onChange={_onChange('startDate')} value={options.startDate} className="options-date-picker" />
            <DatePicker onChange={_onChange('endDate')} value={options.endDate} className="options-date-picker" />

            <div className="checkbox-container">
                <Checkbox
                    className="ride-sort-cb"
                    html={<div>Sort {options.reversed ? '▼' : '▲'}</div>}
                    forceState={options.reversed}
                    onClick={_onChange('reversed')} />

                <MdClear className="edit-meas-btn" onClick={reset} title="Unselect all trips"/>
            </div>

        </div>
    )
}

export default OptionsSelector;