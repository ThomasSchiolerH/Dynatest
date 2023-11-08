import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode } from 'react';



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
};

const DataContext = createContext<ContextType>({
    data: null,
    setData: () => {},
});

type DataProviderProps = {
    children: ReactNode;
};

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<RoadData | null>(null);

    return (
        <DataContext.Provider value={{ data, setData }}>
                {children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}
