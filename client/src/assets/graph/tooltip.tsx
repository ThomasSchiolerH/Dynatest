

import * as d3 from "d3";
import { GraphPoint } from "./types";
import { valToTime } from "./utils";

class Tooltip 
{
    private id = "tooltip";
    private time: boolean | undefined;

    constructor(time: boolean | undefined)
    {
        this.time = time;
    }

    mouseOver( e: any, d: GraphPoint ) 
    {
        const { clientX, clientY } = e;
        const xVal = d.x
        const yVal = d.y.toPrecision(6)
        const elt = document.getElementById(this.id) as HTMLElement;
        
        const { width, height } = elt.getBoundingClientRect()

        const tX = Math.max(0, Math.min(clientX - width / 2, window.innerWidth - width))
        const tY = clientY - height * 1.3;

        const x = this.time ? valToTime(xVal) : xVal.toPrecision(6);

        d3.select('#' + this.id)
            .html(`
                <div>
                    <b>x:</b> ${x}<br/>
                </div>
                <div>
                    <b>y:</b> ${yVal}
                </div>
            `)
            .style('position', 'fixed')
            .style('transform', `translate(${tX}px, ${tY}px)`)
            .style('z-index', 999999)	
            .style('opacity', 0.8)
    }

    mouseOut() 
    {
        d3.select('#' + this.id)
            .style('z-index', -9999)
            .style("opacity", 0);
    }
}

export default Tooltip