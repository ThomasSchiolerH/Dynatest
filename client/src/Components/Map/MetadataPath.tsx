
import { FC, useState, useRef, useEffect } from "react";

import {Popup, CircleMarker,} from "react-leaflet";
import { PathProps } from "../../models/path";
import Path from "./Path";
import { valToTime } from "../../assets/graph/utils"
import { PointData } from "../../models/path"
import { useHoverContext } from "../../context/GraphHoverContext";
import { useMap } from "react-leaflet";
import { Map } from "leaflet"


const parseMD = (mds: any) => {
    
    if ( typeof mds === 'object' && Array.isArray(mds) )
    {
        return <div key={`md-${Math.random()}`}>{mds.map(md => parseMD(md)).join(', ')}</div>
    }
    else if ( typeof mds === 'object' )
    {
        return Object.keys(mds).map(k => 
            <div key={`md-${Math.random()}`}> {' > '} {k}: {parseMD(mds[k])}</div>
        )
    }

    return mds
}

const getPopupLine = (key: string, value: any) => {
    if ( value === undefined || value === null )
        return null;

    else if ( typeof value === 'object' )
        return <div key={`popupline-${Math.random()}`}>{key}:{parseMD(value)}</div>
    
    return <div key={`popupline-${Math.random()}`}>{key}: {value}</div>
}

const MetadataPath: FC<PathProps> = ( { path, properties, metadata } ) => {

    const [selected, setSelected] = useState<PointData | undefined>(undefined);

    const { dotHover, setMap } = useHoverContext()

    const map = useMap();

    const onClick = (i: number) => (e: any) => {
        if (path[i] !== undefined) {
            setSelected(path[i])
        }
    }

    const markerRef = useRef<any>(null);

    useEffect( () => {
            if (markerRef !== null && markerRef.current !== null && markerRef.current.openPopup !== undefined) {
                markerRef.current.openPopup()
            }
            setMap(map);
        }, [markerRef,selected]
    )

    const md = metadata || {}

    return ( <> 
        <Path path={path} properties={properties} onClick={onClick}></Path>


        { selected !== undefined &&
            <CircleMarker
                center={[selected.lat, selected.lng]}
                ref={markerRef}
                opacity={0}
                color="red"
                fillOpacity={0}
                fillColor="red"
                radius={0}
            >
                <Popup onClose={() => {
                    setSelected(undefined)
                }}>
                    {md["TaskId"] !== undefined ?
                        getPopupLine("TaskId", md["TaskId"]) : ""}
                    {selected.metadata.dateTime !== undefined ?
                        getPopupLine("Date / time", selected.metadata.dateTime) : ""}
                    {selected.metadata.timestamp !== undefined ?
                        getPopupLine("Relative time", valToTime(selected.metadata.timestamp / 60000)) : ""}
                    {selected.lat !== undefined && selected.lng !== undefined ?
                        getPopupLine("Position", "lat: " + selected.lat.toFixed(5) + ", lon: " + selected.lng.toFixed(5)) : ""}
                    {getPopupLine(selected.metadata.type !== undefined ? selected.metadata.type : "Value", selected.value)}
                    { /*  getPopupLine('Properties', properties)  }
                    { Object.keys(point.metadata || {}).map(key => getPopupLine(key, point.metadata[key]))  }
                    { Object.keys(md).map(key => getPopupLine(key, md[key])) */}
                </Popup>
            </CircleMarker>
        }

        { dotHover !== undefined &&
            <CircleMarker
            center={[dotHover.point.lat, dotHover.point.lng]}
            ref={markerRef}
            opacity={1}
            color="red"
            fillOpacity={0.1}
            fillColor="red"
            radius={15}
            />
        }
    </> )
}

export default MetadataPath;
