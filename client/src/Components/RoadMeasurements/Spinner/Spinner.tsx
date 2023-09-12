import { FC } from "react"
import "./spinner.css"

/* Spinner inspired by the examples from https://loading.io/css/ */
const Spinner: FC = () => {

    return (
        <div className="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    )
}

export default Spinner;