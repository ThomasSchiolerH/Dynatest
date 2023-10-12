import { Routes, Route } from "react-router-dom";
import "./App.css";

//pages
import Home from "./pages/Home";
import About from "./pages/About";
import ConditionMap from "./pages/ConditionMap";
import NavigationBar from "./pages/NavigationBar";

export default function App() {
    return (
        <div>
            <NavigationBar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="home" element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="conditionmap" element={<ConditionMap />} />
            </Routes>
        </div>
    );
}


