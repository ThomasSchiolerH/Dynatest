import React from 'react';
import "../css/Home.css";
import singleConditionToggledImg from "../images/singlecondition.png";
import multipleConditionsToggledImg from "../images/multcondition.png";
import importDataImg from "../images/import data.png"
import homeImg from "../images/HomePage.png"
import dataWindow1Img from "../images/DataWindowAdjust.png"
import dataWindow2Img from "../images/DataWindowContent.png"
import searchBarImg from "../images/SearchBar.png"

/**
 * @author Alexander Vaaben s(214958) & Thomas Schioler Hansen (s214968)
 * */
const Home = (props: any) => {
    const titleText = "Instructions";
    const navigationBarText = "Use the navigation bar at the top of the site to navigate between the different content pages. You are currently on the home screen where you can find instructions on how to use the site."
    const importDataText = "Clicking Import Data in the navigation bar accesses the Import Data page. From here you can import your own data. First select the data type you wish to import from the data type bar and then press the big dotted box to select the desired data from your computer files. The site can only handle .zip files."
    const conditionMapText = "Clicking Condition Map in the navigation bar accesses the condition map page. From here if you can use the toggle bar on the left hand side of the screen to select which data type you want to display on the map. Here we e.g. wanted to see the KPI data displayed."
    const multipleConditionsToggledText = "If you have toggled multiple switches with condition types, only the top-most toggled switch will be displayed on the map. In the example to the right, we have toggled both 'KPI' and 'DI', meaning that only the KPI data will be displayed on the map. The data type with map priority will have a green highlight";
    const dataWindow1 = "Toggling DATA opens the data window. After opening the data window new buttons will appear that allow you to adjust the width of the data window. You can also grab the right edge of the data window and drag to resize"
    const dataWindow2 = "Clicking on a road will display the toggled data for that road in the data window. The data is displayed as graphs where the x-axis has the distance of a point on the road and the y-axis has the data value for that given point. You can adjust the x-axis using the slider and holding the slider for a short moment after adjusting will cause the other graphs to make the same adjustments so that it is easier to compare the different data types for the given road"
    const searchBarText = "You can use the search bar in the top right hand side of the page to search for a specific road on the map. This will adjust the map so that the road is shown and highlight it."

    return (
        <div className="homeContainer">
            <div className="instructionsHeader">{titleText}</div>

            <div className="contentRow">
                <div className="leftText">{navigationBarText}</div>
                <img src={homeImg} alt="Navigation bar image" className="image" />
            </div>

            <div className="contentRow">
                <img src={importDataImg} alt="Import Data - Image" className="image" />
                <div className="rightText">{importDataText}</div>
            </div>

            <div className="contentRow">
                <div className="leftText">{conditionMapText}</div>
                <img src={singleConditionToggledImg} alt="Condition map image" className="image" />
            </div>

            <div className="contentRow">
                <img src={multipleConditionsToggledImg} alt="Multple condition toggled - Image" className="image" />
                <div className="rightText">{multipleConditionsToggledText}</div>
            </div>

            <div className="contentRow">
                <div className="leftText">{dataWindow1}</div>
                <img src={dataWindow1Img} alt="Data window image1" className="image" />
            </div>

            <div className="contentRow">
                <img src={dataWindow2Img} alt="Data window image2" className="image" />
                <div className="rightText">{dataWindow2}</div>
            </div>

            <div className="contentRow">
                <div className="leftText">{searchBarText}</div>
                <img src={searchBarImg} alt="search bar" className="image" />
            </div>

        </div>
    );
}

export default Home;