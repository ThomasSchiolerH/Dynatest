import {FC, useEffect, useState} from "react";

import {useMeasurementsCtx} from "../../context/MeasurementsContext";
import {GraphProvider} from "../../context/GraphContext";
import {useMetasCtx} from "../../context/MetasContext";

import {ActiveMeasProperties, XAxisType} from "../../models/properties";
import {MeasMetaPath, PointData} from "../../models/path";

import {GraphData} from "../../assets/graph/types";

import {getRide} from "../../queries/rides";

import Graph from "../Graph/Graph";
import RidesMap from "./RidesMap";
import createPopup from "../createPopup";
import Spinner from "./Spinner/Spinner"
import {HoverProvider} from "../../context/GraphHoverContext";

interface AsyncTask {
    path: MeasMetaPath
    name: string
    taskId: number
}

const Rides: FC = () => {

    const { selectedMetas } = useMetasCtx()
    const { selectedMeasurements } = useMeasurementsCtx()

    const [ paths, setPaths ] = useState<MeasMetaPath>({})

    const [ loading, setLoading ] = useState<Set<AsyncTask>>(new Set())

    useEffect( () => {

        const popup = createPopup()

        const localLoading = new Set<AsyncTask>()
        setLoading(localLoading)

        const updatePaths = async () => {
            const temp = {} as MeasMetaPath;
            const oldPaths = paths;

            for ( let meas of selectedMeasurements ) {
                const { name } = meas
                temp[name] = {}

                for ( let meta of selectedMetas ) {
                    const {TaskId} = meta;

                    if (Object.hasOwn(oldPaths, name) && Object.hasOwn(oldPaths[name], TaskId)) {
                        temp[name][TaskId] = oldPaths[name][TaskId]
                    }
                }

                let asyncWaiting = false;
                for ( let meta of selectedMetas ) {
                    const {TaskId} = meta;

                    if (!(Object.hasOwn(oldPaths, name) && Object.hasOwn(oldPaths[name], TaskId))) {
                        asyncWaiting = true
                        // TODO ekki@dtu.dk: here ride data are fetched at a time
                        //     this could probably done in parallel, but would need major revision
                        //     since right now all paths are dealt with as a single state paths.

                        const task: AsyncTask = { path: temp, name: name, taskId: TaskId }

                        localLoading.add(task);
                        setLoading( (tasks) => {
                            const tasksNew = new Set(tasks)
                            tasksNew.add(task)
                            return tasksNew
                        })
                        getRide(meas, meta, popup)
                            .then( (bp) => {
                                if (bp !== undefined) {
                                    temp[name][TaskId] = bp;
                                }
                            })
                            .finally( () => {
                                localLoading.delete(task)
                                if (localLoading.size === 0) {
                                    setPaths(temp)
                                }
                                setLoading( (tasks) => {
                                        const tasksNew = new Set(tasks)
                                        tasksNew.delete(task)
                                        return tasksNew
                                    }
                                )
                            })
                    }
                }
                if (!asyncWaiting) {
                    setPaths(temp)
                }
            }
        }

        updatePaths()

    }, [selectedMetas, selectedMeasurements] )

    return (
        <HoverProvider>
        <GraphProvider>
            <div>

                { (loading.size > 0) ? <Spinner/> : <div/> }

                <div className="map-container">

                    <RidesMap
                       paths={paths}
                       selectedMetas={selectedMetas}
                       selectedMeasurements={selectedMeasurements}  />

                    <div style={{ display: "flex", flexDirection: "column" /*, height: "100%" */}}>
                    { selectedMeasurements.map( ({xAxisType, hasValue, name, palette}: ActiveMeasProperties, i: number) => hasValue &&
                        <GraphProvider>
                            { /* ekki@dtu.dk: this additional GraphProvider is a hack to make sure that the different graphs do
                                              are not mixed up, in particular concerning the maxY of the y-axis; but this
                                              should be cleaned up since the inner and outer GraphProvider should share some
                                              values (like the colour gradient and maxX). We could probably compute the data from the graph context
                                              when the paths are updated. */  }
                        <Graph
                            key={`graph-${i}`}
                            labelX={xAxisType ? "" + xAxisType : XAxisType.distance}
                            labelY={name}
                            absolute={true}
                            time={xAxisType === XAxisType.timeHMS}
                            palette={palette}
                            plots={ Object.entries(paths[name] || {})
                                .map( ([TaskId, bp], j) => {
                                    const { path, bounds } = bp;
                                    const x = (p: PointData) =>
                                        (xAxisType === XAxisType.timeHMS)  ?
                                            p.metadata.timestamp / 60000 : // convert timestamp from [ms] to [min]
                                            ( (xAxisType === XAxisType.timeSec)  ?
                                                p.metadata.timestamp / 1000 : // convert timestamp from [ms] to [s]
                                                p.metadata.dist / 1000 ) // convert distance from [m] to [km]
                                    const data: GraphData = path
                                        .map( (p) => { return { x: x(p),  y: p.value || 0, lat: p.lat, lng: p.lng }})
                                        // .sort( (d1, d2) => (d1.x < d2.x) ? -1 : (d1.x === d2.x) ? 0 : 1 )
                                    return { data, bounds, label: 'r-' + TaskId, j }
                                } )
                            }
                        />
                        </GraphProvider>
                    ) }
                    </div>
                </div>
            </div>
        </GraphProvider>
        </HoverProvider>
  )
}

export default Rides;
