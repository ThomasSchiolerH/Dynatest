// DataContext.js

import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode } from 'react';

type ContextType = {
    data: JSON | null;
    setData: Dispatch<SetStateAction<JSON | null>>;
};

const DataContext = createContext<ContextType>({
    data: null,
    setData: () => {},
});

type DataProviderProps = {
    children: ReactNode;
};

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<JSON | null>(null);

    return (
        <DataContext.Provider value={{ data, setData }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}
