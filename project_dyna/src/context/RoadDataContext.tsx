import React, { createContext, useContext, useState, useRef, Dispatch, SetStateAction, ReactNode } from 'react';
import L, { GeoJSON } from 'leaflet';

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

interface DataAll {
    features: GeoJSON.Feature<GeoJSON.Geometry>[];
    // Add other properties of FeatureCollection if needed
}

type ContextType = {
    data: RoadData | null;
    setData: Dispatch<SetStateAction<RoadData | null>>;
    map: L.Map | null;
    setMap: Dispatch<SetStateAction<L.Map | null>>;
    dataAll: DataAll | null;
    setDataAll: Dispatch<SetStateAction<DataAll | null>>;
    highlightRoad: (roadName: string) => void;
    clearHighlightedRoads: () => void;
};

const DataContext = createContext<ContextType>({
    data: null,
    setData: () => {},
    map: null,
    setMap: () => {},
    dataAll: null,
    setDataAll: () => {},
    highlightRoad: () => {},
    clearHighlightedRoads: () => {},
});

type DataProviderProps = {
    children: ReactNode;
};

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<RoadData | null>(null);
    const [map, setMap] = useState<L.Map | null>(null);
    const [dataAll, setDataAll] = useState<DataAll | null>(null);
    const roadHighlightLayerGroup = useRef(new L.LayerGroup()).current;

    const highlightRoad = (roadName: string) => {
        if (dataAll && dataAll.features && map) {
            const roadFeatures = dataAll.features.filter(
                (f) => f.properties !== null && f.properties.road_name === roadName
            );

            roadHighlightLayerGroup.clearLayers();
            roadFeatures.forEach((roadFeature) => {
                const roadHighlight = L.geoJSON(roadFeature.geometry, {
                    style: {
                        weight: 8,
                        color: 'blue',
                        opacity: 0.3,
                    },
                });
                roadHighlightLayerGroup.addLayer(roadHighlight);
            });

            roadHighlightLayerGroup.addTo(map);
        }
    };

    const clearHighlightedRoads = () => {
        roadHighlightLayerGroup.clearLayers();
    };

    return (
        <DataContext.Provider value={{ data, setData, map, setMap, dataAll, setDataAll, highlightRoad, clearHighlightedRoads }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}
