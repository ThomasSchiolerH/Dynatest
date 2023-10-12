
const Home = (props: any) => {
    const containerStyle = {
        paddingLeft: '115px',
        paddingRight: '750px',
        paddingTop: '25px',
        color: 'white'
    };

    return (
        <div style={containerStyle}>
            <p>
                Roads require constant maintenance to ensure the smooth flow of traffic.
                However, they do not necessarily degrade in a predictable fashion, and as such,
                pavement analysis is important to gain an overview of the road conditions,
                so road maintainers know where to prioritize their resources. For that reason,
                there are organizations that collect data which can be used to assess road conditions.
                One such organization is Dynatest who have special vehicles that are made to collect
                this kind of data and do comprehensive pavement analysis.
                <br /><br />
                Today, there also exists the Live Road Assessment project (LiRA) which is able to use
                car sensor data in regular passenger cars to do pavement analysis using machine
                learning and mathematical models. Dynatest's equipment likely provides a more accurate
                description of the road condition due to their specialized vehicles that are built
                to collect pavement data and can take photos of the road, while LiRA collects car
                sensor data and thus must indirectly infer what the road condition is based on the
                collected data from the car sensors.
                <br /><br />
                The data collected by both LiRA and Dynatest both do measurements on a
                distance scale, meaning that a specific measurement is bound to some
                distance the car has driven since the beginning of the trip. The overall objective
                for this app is to use data from LiRA and Dynatest to visualize the road condition
                in a presentable way that makes it useful for people who work in different areas of
                road maintenance going from the people who fix the road to the people in charge.
            </p>
        </div>
    );
}

export default Home;
