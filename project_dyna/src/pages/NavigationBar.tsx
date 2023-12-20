import { FC } from "react";
import { NavLink, useLocation } from 'react-router-dom';


import '../css/navigationbar.css';
import SearchBar from "../Components/SearchBar";

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @interface
 */
interface NavBtnProps {
    to: string;
    name: string;
}

const NavBtn: FC<NavBtnProps> = ( { to, name } ) => {
    return (
        <NavLink
            className='nav-tab'
            to={to}
        >
            { name }
        </NavLink>
    )
}

/**
 * @author Jakob Kildegaard Hansen (s214952)
 * @output Returns the navigation bar
 */
const NavigationBar = () => {
    const location = useLocation();

    const isConditionMapRoute = location.pathname === '/conditionmap';

    return (
        <div className="nav-wrapper">
            <div className="nav-container">
                <div className="nav-block">
                    <NavBtn  to='/home' name='Home' />
                    <NavBtn  to='/conditionmap' name='Condition Map' />
                    <NavBtn  to='/importdata' name='Import Data' />
                </div>
                {isConditionMapRoute && <SearchBar />}
            </div>
        </div>
    )
}

export default NavigationBar;
