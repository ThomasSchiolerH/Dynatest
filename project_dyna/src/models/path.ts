// Represents a point containing (lat, lng) coordinates, 
import { LatLng } from "./models";

/**
 * @Old-project-file these methods are reused from the original project
 */

// rendering properties, and optionally, a value and some metadata (like timestamp)
export interface PointData extends LatLng {
	value?: number;   	   			
	metadata?: any;
}

// A Path is a collection of points
export type Path = PointData[]

export type Metadata =  { [key: string]: any }

export interface Bounds {
    minX?: number;
    maxX?: number;
	minY?: number;
    maxY?: number; 
}

export interface Node {
    lat: number;
	lng: number;
	way_dist: number;
}

export interface ValueLatLng extends LatLng {
	value: number;
}

export interface Condition {
	way_dist: number;
	value: number;
}

export type WayId = string;

export interface WaysConditions { 
	way_lengths: number[];
	way_ids: WayId[];
	geometry: Node[][];
	conditions: Condition[][];
}

