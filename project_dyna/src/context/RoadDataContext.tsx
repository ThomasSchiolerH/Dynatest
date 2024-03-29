import React, {
    createContext,
    useContext,
    useState,
    Dispatch,
    SetStateAction,
    ReactNode
} from 'react';
import L, {Map, LayerGroup} from 'leaflet';
import {get} from "../queries/fetch";

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @interface
 */
interface Geometry {
    type: string;
    coordinates: Array<Array<[number, number]>>;
}

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @interface
 */
interface RoadData {
    success: boolean;
    road_name: string;
    road_distance: number;
    initial_distance: number;
    road_geometry: Geometry
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
    pictures: Array<{
        distance: number;
        Image3D: string | null;
        ImageInt: string | null;
        ImageRng: string | null;
        Overlay3D: string | null;
        OverlayInt: string | null;
        OverlayRng: string | null;
    }>;
}

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @interface
 */
interface FeatureCollection {
    features: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>[];
}

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @Type
 */
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

type DataProviderProps = { children: ReactNode; };

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @Context-variables
 */
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


/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @Context-wrapper
 */
export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<RoadData | null>(null);
    const [map, setMap] = useState<Map | null>(null);
    const [roadHighlightLayerGroup, setRoadHighlightLayerGroup] = useState<LayerGroup | null>(null);
    const [dataAll, setDataAll] = useState<FeatureCollection | undefined>({ features: [] });

    return (
        <DataContext.Provider value={{ data, setData, map, setMap, roadHighlightLayerGroup, setRoadHighlightLayerGroup, dataAll, setAllData: setDataAll}}>
            {children}
        </DataContext.Provider>
    );
}

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @Context-function
 */
export function useData() {
    return useContext(DataContext);
}

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @output Highlights the road segments of the searched road
 */
export function useRoadHighlight() {
    const context = useContext(DataContext);
    const { setData } = useData();

    if (!context) {
        throw new Error('useRoadHighlight must be used within a DataProvider');
    }

    const highlightRoad = (roadName: string) => {
        if (context.dataAll && context.dataAll.features && context.map && context.roadHighlightLayerGroup) {
            context.roadHighlightLayerGroup.clearLayers();

            const roadFeatures = context.dataAll.features.filter(
                (f) => f.properties !== null && f.properties.way_name === roadName
            );

            if (roadFeatures.length > 0) {
                const osmId = roadFeatures[0].properties?.osm_id;

                if (osmId !== undefined && osmId !== null) {
                    get(`/conditions/road/${osmId}`, (data: RoadData) => {
                        if (data.success) {
                            setData(data);
                        }
                        console.log(data);
                    });
                } else {
                    console.error('osm_id is null or undefined');
                }
            }

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

