import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode } from 'react';
import {map} from "leaflet";


interface Geometry {
    type: string;
    coordinates: Array<Array<[number, number]>>;
}

interface RoadData {
    success: boolean;
    road_name: string;
    road_distance: number;
    initial_distance: number;
    road_geometry: Geometry;
    road: Array<{
        lat: number;
        lon: number;
        distance: number;
        IRI: number | null;
        E_norm: number | null;
        KPI: number | null;
        Mu: number | null;
        DI: number | null;
    }>;
}


type ContextType = {
    data: RoadData | null;
    setData: Dispatch<SetStateAction<RoadData | null>>;
    map: L.Map | null;
    setMap: Dispatch<SetStateAction<L.Map | null>>;
};

const DataContext = createContext<ContextType>({
    data: null,
    setData: () => {},
    map: null,
    setMap: () => {}
});

type DataProviderProps = {
    children: ReactNode;
};

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<RoadData | null>(null);
    const [map, setMap] = useState<L.Map | null>(null);

    return (
        <DataContext.Provider value={{ data, setData, map, setMap }}>
                {children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}
