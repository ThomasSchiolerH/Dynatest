
import axios, {AxiosRequestConfig, AxiosResponse } from 'axios'

const development = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

const devURL = process.env.REACT_APP_BACKEND_URL_DEV
const prodURL = process.env.REACT_APP_BACKEND_URL_PROD

const getPath = (p: string) => ( development ? devURL : prodURL ) + p

export function get<T>(path: string, callback: (data: T) => void): void 
{
    fetch(getPath(path))
        .then(res => res.json())
        .then(data => callback(data));
}

export function post<T>(path: string, obj: object, config?: AxiosRequestConfig): Promise<AxiosResponse<T, any>>
{
    return axios.post(getPath(path), obj, config ? config : undefined)
}

export const put = ( path: string, obj: object ): void => {
    axios.put( getPath(path), obj  )
}

export const deleteReq = ( path: string ): void => {
    axios.delete( getPath(path) )
}