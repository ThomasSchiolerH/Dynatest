import { FC, useEffect, useState, ReactNode } from "react";
import { List, ListRowRenderer } from "react-virtualized";

import Checkbox from '../Checkbox';

import { RideMeta, TripsOptions } from '../../models/models'

import '../../css/ridecard.css'
import { useMetasCtx } from "../../context/MetasContext";
import OptionsSelector from "./OptionsSelector";


interface CardsProps {
    showMetas: RideMeta[]
    selectedMetas: RideMeta[]
    onClick: (meta: RideMeta, i: number, isChecked: boolean) => void;
}

const Cards: FC<CardsProps> = ( { showMetas, selectedMetas, onClick } ) => {
    const renderRow: ListRowRenderer = ( { index, key, style } ): ReactNode => {
        const meta = showMetas[index];
        return <div key={key} style={style}>
            <Checkbox
                forceState={selectedMetas.includes(meta) }
                className="ride-card-container"
                html={<div><b>{meta.TaskId}</b><br></br>{new Date(meta.StartTimeUtc).toLocaleDateString()}</div>}
                onClick={(isChecked) => {
                    onClick(meta, index, isChecked) 
                }} />
        </div>
    }

    return <List
        width={170}
        height={2500}
        rowHeight={61}
        rowRenderer={renderRow}
        rowCount={showMetas.length} /> 
}

/*
interface SelectMeta extends RideMeta {
    selected: boolean;
}
*/

const defaultOptions: TripsOptions = {
    search: '',
    startDate: new Date("2022-01-01"),
    endDate: new Date(),
    reversed: false
}

const RideCards: FC = ( ) => {   
    
    const { metas, selectedMetas, setSelectedMetas } = useMetasCtx();

    // const [showMetas, setShowMetas] = useState<SelectMeta[]>([])
    const [showMetas, setShowMetas] = useState<RideMeta[]>([])

    const [options, setOptions] = useState<TripsOptions>(defaultOptions)

    /*
    useEffect( () => {
        // onChange(metas.map(m => ({...m, selected: false})), options )
        onChange(metas, options )
    }, [metas])
     */

    useEffect( () => {
        onChange(metas, options)
    }, [options, metas])

    const onChange = ( metas:RideMeta[], { search, startDate, endDate, reversed }: TripsOptions) => {
        const temp: RideMeta[] = metas
            .filter( (meta: RideMeta) => {
                const inSearch = search === "" || meta.TaskId.toString().includes(search)
                const date = new Date(meta.StartTimeUtc).getTime()
                const inDate =
                    (startDate === null || date >= startDate.getTime()) &&
                    (endDate === null || date < endDate.getTime() + 24*60*60*1000)
                return inSearch && inDate
            } )
            /*.map( (meta: RideMeta) => {
                const selected = selectedMetas.find( ( { TripId } ) => meta.TripId === TripId ) !== undefined
                return { ...meta, selected }
            } ) */
        setShowMetas( reversed ? temp.reverse() : temp )
    }

    const reset = () => {
        // ekki@dtu.dk: We could go back to the default options:
        //   setOptions(defaultOptions)
        // But for now, we just reset the selected trips
        setSelectedMetas([])
    }

    const onClick = ( md: RideMeta, i: number, isChecked: boolean) => {
        // const temp = [...showMetas]
        // temp[i].selected = isChecked
        // setShowMetas(temp)

        return isChecked 
            ? setSelectedMetas( prev => [...prev, md] )
            : setSelectedMetas( prev => prev.filter( ({ TripId }) => md.TripId !== TripId ) )
    }
        

    return (
        <div className="ride-list">
            <OptionsSelector options={options} setOptions={setOptions} reset={reset} />
            <Cards showMetas={showMetas} selectedMetas={selectedMetas} onClick={onClick} />
        </div>
    )
}

export default RideCards;
