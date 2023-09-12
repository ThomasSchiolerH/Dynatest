import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

import '@sweetalert2/theme-dark';

const swal = withReactContent(Swal)

const createPopup = <T,>() => {
    return ( options: SweetAlertOptions<any, any> ): Promise<SweetAlertResult<T>> => {
        return swal.fire( { 
            ...options,
            // ekki@dtu.dk: the following two lines hard code the style in order to
            // overcome style conflicts (different orders of css)
            background: "#2e2e2e",
            color: "white",
            customClass: { 
                popup: 'sweetalert-popup', 
                title: 'sweetalert-title'
            } 
        } )
    }
}

export default createPopup
