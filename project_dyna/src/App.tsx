import { Routes, Route } from "react-router-dom";
import "./App.css";
import { DataProvider} from "./context/RoadDataContext";

//pages
import Home from "./pages/Home";
import ConditionMap from "./pages/ConditionMap";
import NavigationBar from "./pages/NavigationBar";
import ImportData from "./pages/ImportData";
import SearchBar from "./Components/SearchBar";

export default function App() {
    return (
        <div>
            <DataProvider>
                <NavigationBar/>
                <Routes>
                    <Route path="/" element={<Home/>} />
                    <Route path="home" element={<Home />} />
                    <Route path="conditionmap" element={ <ConditionMap />} />
                    <Route path="importdata" element={<ImportData />} />
                </Routes>
            </DataProvider>
        </div>
    );
}


