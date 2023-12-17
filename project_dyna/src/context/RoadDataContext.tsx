import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode, useRef } from 'react';
import L, { Map, GeoJSON, LayerGroup } from 'leaflet';

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

interface FeatureCollection {
    features: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>[];
}

type ContextType = {
    data: RoadData | null;
    setData: Dispatch<SetStateAction<RoadData | null>>;
    map: Map | null;
    setMap: Dispatch<SetStateAction<Map | null>>;
    roadHighlightLayerGroup: LayerGroup<any> | null;
    dataAll: FeatureCollection | undefined;
    setRoadHighlightLayerGroup: Dispatch<SetStateAction<L.LayerGroup | null>>;
    setAllData: Dispatch<SetStateAction<FeatureCollection | undefined>>;

};

const DataContext = createContext<ContextType>({
    data: null,
    setData: () => {},
    map: null,
    setMap: () => {},
    roadHighlightLayerGroup: new L.LayerGroup(),
    dataAll: undefined,
    setAllData: () => {},
    setRoadHighlightLayerGroup: () => {},
});

type DataProviderProps = {
    children: ReactNode;
};

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<RoadData | null>(null);
    const [map, setMap] = useState<Map | null>(null);
    const [roadHighlightLayerGroup, setRoadHighlightLayerGroup] = useState<LayerGroup | null>(null);
    const [dataAll, setDataAll] = useState<FeatureCollection | undefined>({ features: [] });


    return (
        <DataContext.Provider value={{ data, setData, map, setMap, roadHighlightLayerGroup, setRoadHighlightLayerGroup, dataAll, setAllData: setDataAll }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}

export function useRoadHighlight() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useRoadHighlight must be used within a DataProvider');
    }

    const highlightRoad = (roadName: string) => {
        if (context.dataAll && context.dataAll.features && context.map && context.roadHighlightLayerGroup) {
            const roadFeatures = context.dataAll.features.filter(
                (f) => f.properties !== null && f.properties.way_name === roadName
            );

            context.roadHighlightLayerGroup.clearLayers();
            roadFeatures.forEach((roadFeature) => {
                const roadHighlight = L.geoJSON(roadFeature.geometry, {
                    style: {
                        weight: 8,
                        color: 'blue',
                        opacity: 0.3,
                    },
                });
                if (context.roadHighlightLayerGroup){
                    context.roadHighlightLayerGroup.addLayer(roadHighlight);
                }

            });

            context.roadHighlightLayerGroup.addTo(context.map);
        }
    };

    const clearHighlightedRoads = () => {
        if (context.roadHighlightLayerGroup) {
            context.roadHighlightLayerGroup.clearLayers();
        }
    };

    return {
        highlightRoad,
        clearHighlightedRoads,
    };
}

