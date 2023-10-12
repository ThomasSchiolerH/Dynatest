
import React from 'react';

const About = (props: any) => {
    const containerStyle = {
        paddingLeft: '115px',
        paddingRight: '750px',
        paddingTop: '25px',
        color: 'white'
    };

    return (
        <div style={containerStyle}>
            <p>
                The core functionality of the application lies within its "Condition Map" feature,
                which provides users with a comprehensive visual representation of data sourced
                from both Dynatest and LiRA. This feature allows users to gain valuable insights
                by presenting the data through an interactive map and accompanying graphs.
                <br /><br />
                On the left-hand side of the screen, users can easily toggle between various
                data sets using intuitive buttons. This enables users to quickly locate and
                display their preferred data on the map. Simultaneously, users have the flexibility
                to toggle the data window, which displays information corresponding to the selected
                parameters (KPI, DI, IRI, Mu, E_norm) in the form of visually accessible graphs.
                This dynamic and user-friendly interface ensures that users can seamlessly explore
                and analyze the data, all while retaining the ability to interact with the map by
                dragging, zooming, and selecting new data points. In essence, this feature enhances
                the user experience by streamlining data visualization and analysis, offering a
                comprehensive and intuitive tool for interpreting complex data sets.
            </p>
        </div>
    );
}

export default About;
