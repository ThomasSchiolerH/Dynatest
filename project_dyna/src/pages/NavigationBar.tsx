import { FC } from "react";
import { NavLink } from 'react-router-dom';


import '../css/navigationbar.css';

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

const NavigationBar: FC = () => {
    return (
        <div className="nav-wrapper">
            <div className="nav-container">
                <div className="nav-block">
                    <NavBtn  to='/home' name='Home' />
                    <NavBtn  to='/conditionmap' name='Condition Map' />
                    <NavBtn  to='/importdata' name='Import Data' />
                </div>
            </div>
        </div>
    )
}

export default NavigationBar;
