import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode } from 'react';
import {map} from "leaflet";



interface RoadData {
    success: boolean;
    way_name: string;
    is_highway: boolean;
    section_geom: string;
    coverage: {
        [key: string]: number[];
    };
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
