
import { FC, useEffect } from "react"

import GLine from "../../assets/graph/line"

import { useGraph } from "../../context/GraphContext";

import { Axis, DotHover, GraphData, SVG } from "../../assets/graph/types"
import { Bounds } from "../../models/path";
import { useHoverContext } from "../../context/GraphHoverContext";


interface ILine {
    svg: SVG;
    xAxis: Axis | undefined;
    yAxis: Axis | undefined;
    data: GraphData;
    bounds?: Bounds;
    label: string; i: number;
    time: boolean | undefined;
}

const epsilon = 0.0001

const Line: FC<ILine> = ( { svg, xAxis, yAxis, data, bounds, label, i, time } ) => {

    const { addBounds, remBounds } = useGraph()

    const { setDotHover, map } = useHoverContext()

    useEffect( () => {

        if ( xAxis === undefined || yAxis === undefined ) return;

        const minY = Math.min(...data.map( d => d.y ));
        const _bounds: Required<Bounds> = Object.assign( {
            minX: Math.min(...data.map( d => d.x )),
            maxX: Math.max(...data.map( d => d.x )),
            minY: minY,
            // TODO ekki@dtu.dk: quick fix added epsilon for maxY in order to
            // avoid minX and maxX being the same, which ultimately causes
            // an exception when rendering the lines (I guess due to a
            // division by 0 problem when computing the colour). This
            // could be done once for the final bounds.
            maxY: Math.max(Math.max(...data.map( d => d.y), minY+epsilon))
        } )

        addBounds(label, _bounds)

        const onHover = (d: DotHover | undefined) => {
            setDotHover(d)
            if (d !== undefined && map !== undefined && !map.getBounds().contains(d.point)) {
                map.flyTo(d.point, Math.round(map.getZoom()),
                    { animate: true, duration: 1.5} )
            }
        }

        const line = new GLine(svg, label, i, data, xAxis, yAxis, onHover, time)

        return () => {
            if ( svg === undefined )
                return console.log('ERROR, TRYING TO REMOVE GRAPH DATA WHILE SVG = undefined');

            line.rem()
            remBounds(label)
        }

    }, [svg, xAxis, yAxis, data, label, bounds, i, setDotHover])

    return null

}

export default Line