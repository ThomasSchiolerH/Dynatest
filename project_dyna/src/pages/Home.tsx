import React from 'react';
import "../css/Home.css";
import DataWindowImg from "../images/DataWindowImg.png";

const Home = (props: any) => {
    return (
        <div className="homeContainer">
            <div className="tutorialHeader">Tutorial</div>

            <div className="contentRow">
                <div className="leftText">Text goes here. This is your first block of text.</div>
                <img src={DataWindowImg} alt="Description for Image 1" className="image" />
            </div>

            <div className="contentRow">
                <div className="image"></div>
                <div className="rightText">Text goes here. This is your second block of text.</div>
            </div>

            <div className="contentRow">
                <div className="leftText">Text goes here. This is your third block of text.</div>
                <div className="image"></div>
            </div>
        </div>
    );
}

export default Home;