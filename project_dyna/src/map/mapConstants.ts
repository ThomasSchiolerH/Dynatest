import { LatLng } from 'leaflet'
import {Palette} from 'react-leaflet-hotline';
import {ActiveMeasProperties, RendererOptions, XAxisType} from '../models/properties';
import {RendererName} from '../models/renderers';

/**
 * @Old-project-file these methods are reused from the original project
 */

// Options for conditions map
export const MAP_OPTIONS = {
    center: new LatLng(55.672, 12.458),
    zoom: 12,
    minZoom: 3,
    maxZoom: 19,
    scaleWidth: 100
}

// Renderer
export const RENDERER_WIDTH = 4
export const RENDERER_WEIGHT = 4
export const RENDERER_COLOR = 'red'
export const RENDERER_OPACITY = 1.0

export function RENDERER_PALETTE(): Palette  {
    return [
        { r: 0,   g: 160, b: 0,  t: 0    },
        { r: 255, g: 255, b: 0,  t: 0.5  },
        { r: 255, g: 0,   b: 0,  t: 1    }
    ] };


export function RENDERER_OPTIONS(): Required<RendererOptions> {
    return {
        rendererName: 'hotline' as RendererName,
        dilatationFactor: 1,
        arrowHead: 0,
        min: 0,
        max: 10,
        width: RENDERER_WIDTH,
        weight: RENDERER_WEIGHT,
        color: RENDERER_COLOR,
        opacity: RENDERER_OPACITY,
        palette: RENDERER_PALETTE()
    }
}

export function RENDERER_MEAS_PROPERTIES(): Required<ActiveMeasProperties>  {
    return {
        ...(RENDERER_OPTIONS()),
        dbName: '',
        name: '',
        hasValue: true,
        xAxisType: XAxisType.distance,
        isActive: false
    }
}

// Heatmap
export function HEATMAP_PALETTE(): Palette {
    return [
        {r: 0, g: 0, b: 255, t: 0},
        {r: 255, g: 255, b: 255, t: 0.5},
        {r: 255, g: 0, b: 0, t: 1}
    ]
}

export function HEATMAP_OPTIONS()  {
    return {
        max: 10,
        radius: 10,
        palette: HEATMAP_PALETTE()
    }
}