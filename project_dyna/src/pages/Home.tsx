import React from 'react';
import "../css/Home.css";
import DataWindowImg from "../images/DataWindowImg.png";
import singleConditionToggledImg from "../images/singleConditionToggledImg.png";
import multipleConditionsToggledImg from "../images/multipleConditionsToggledImg.png";

const Home = (props: any) => {
    const titleText = "Tutorial";
    const dataWindowText = "When you click on a specific section of a road and you want to see a graph of the data for the condition types that you have selected you can open the data window. This is done by toggling the switch with 'Data' written on it. When doing so a window will appear with the relevant graphs for the road segment that you selected. Please see the image to the right.";
    const singleConditionToggledText = "If you want to see a specific condition type displayed on the map you can enable it. This is done by toggling the switch with the condition type that you want to see. Here we e.g. wanted to see the KPI data displayed, so we toggled the KPI switch. Please see the image to the left.";
    const multipleConditionsToggledText = "If you have toggled multiple switches with condition types, only the top-most toggled switch will be displayed on the map. In the example to the right, we have toggled both 'KPI' and 'DI', meaning that only the KPI data will be displayed on the map. However, if we then decide to untoggle the 'KPI' and keep the 'DI' toggled then the 'DI' data will automatically be displayed on the map.";



    return (
        <div className="homeContainer">
            <div className="tutorialHeader">{titleText}</div>

            <div className="contentRow">
                <div className="leftText">{dataWindowText}</div>
                <img src={DataWindowImg} alt="Data Window Image" className="image" />
            </div>

            <div className="contentRow">
                <img src={singleConditionToggledImg} alt="A single condition toggled - Image" className="image" />
                <div className="rightText">{singleConditionToggledText}</div>
            </div>

            <div className="contentRow">
                <div className="leftText">{multipleConditionsToggledText}</div>
                <img src={multipleConditionsToggledImg} alt="Multple condition toggled - Image" className="image" />
            </div>
        </div>
    );
}

export default Home;