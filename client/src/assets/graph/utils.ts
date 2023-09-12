
const format = (time: number) => {
    if ( time == 0) {
        return '00'
    } else if (time < 10) {
        return '0'+ time
    } else {
        return '' + time
    }
}

/* TODO, ekki@dtu.dk: this should all be part of a single class taking care of all the
    conversions andpresentations concering each type of visualisation */
export const valToTime = (val: number) => {
    // time comes in minutes now (but see above TODO)
    const secondsTotal = Math.round(val*60)
    const seconds = secondsTotal % 60
    const minutesTotal = Math.floor(secondsTotal / 60)
    const minutes = minutesTotal % 60
    const hoursTotal = Math.floor(minutesTotal / 60)
    return hoursTotal + ":" + format(minutes) + ":" + format(seconds)
}