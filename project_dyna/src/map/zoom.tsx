
import { ZoomControl } from "react-leaflet"
import useZoom from './hooks/useZoom'

/**
 * @Original-project-file these methods are reused from the original project
 */

const Zoom = () => {

    const zoom = useZoom()
   
    return (
        <>
        <div className="map-zoom">{zoom}</div>
        <ZoomControl position='topright'/>
        </>
    )
}

export default Zoom