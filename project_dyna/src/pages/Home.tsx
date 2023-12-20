import React from 'react';
import "../css/Home.css";
import DataWindowImg from "../images/DataWindowImg.png";
import singleConditionToggledImg from "../images/singleConditionToggledImg.png";
import multipleConditionsToggledImg from "../images/multipleConditionsToggledImg.png";
import importDataImg from "../images/importDataImg.png"
import homeImg from "../images/HomeImg.png"

/**
 * @author Thomas Schioler Hansen (s214968)
 * */
const Home = (props: any) => {
    const titleText = "Instructions";
    const navigationBarText = "Use the navigation bar at the top of the site to navigate between the different content pages. You are currently on the home screen where you can find instructions on how to use the site."
    const importDataText = "Clicking Import Data in the navigation bar accesses the Import Data page. From here you can import your own data. First select the data type you wish to import from the data type bar and then press the big dotted box to select the desired data from your computer files. The site can handle .rsp, .zip, .jpg and .gpx files."
    const conditionMapText = "Clicking Condition Map in the navigation bar accesses the condition map page. From here if you want to see a specific condition type displayed on the map you can enable it by toggling the switch with the condition type that you want to see on the left hand side. Here we e.g. wanted to see the KPI data displayed."
    const dataWindowText = "When you click on a specific section of a road and you want to see a graph of the data for the condition types that you have selected you can open the data window. This is done by toggling the switch with 'Data' written on it. When doing so a window will appear with the relevant graphs for the road segment that you selected. Please see the image to the right.";
    const singleConditionToggledText = "If you want to see a specific condition type displayed on the map you can enable it. This is done by toggling the switch with the condition type that you want to see. Here we e.g. wanted to see the KPI data displayed, so we toggled the KPI switch. Please see the image to the left.";
    const multipleConditionsToggledText = "If you have toggled multiple switches with condition types, only the top-most toggled switch will be displayed on the map. In the example to the right, we have toggled both 'KPI' and 'DI', meaning that only the KPI data will be displayed on the map. However, if we then decide to untoggle the 'KPI' and keep the 'DI' toggled then the 'DI' data will automatically be displayed on the map.";



    return (
        <div className="homeContainer">
            <div className="instructionsHeader">{titleText}</div>

            <div className="contentRow">
                <div className="leftText">{navigationBarText}</div>
                <img src={homeImg} alt="Navigation bar image" className="image" />
            </div>

            <div className="contentRow">
                <img src={importDataImg} alt="A single condition toggled - Image" className="image" />
                <div className="rightText">{importDataText}</div>
            </div>

            <div className="contentRow">
                <div className="leftText">{conditionMapText}</div>
                <img src={singleConditionToggledImg} alt="Condition map image" className="image" />
            </div>

            <div className="contentRow">
                <img src={DataWindowImg} alt="Data Window Image" className="image" />
                <div className="rightText">{dataWindowText}</div>
            </div>

            <div className="contentRow">
                <div className="leftText">{multipleConditionsToggledText}</div>
                <img src={multipleConditionsToggledImg} alt="Multple condition toggled - Image" className="image" />
            </div>
        </div>
    );
}

export default Home;