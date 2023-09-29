import {Link, Outlet} from "react-router-dom";
import "../css/basicnavigationbar.css"

const basicNavigationBar = () => {
    return (
        <div>
            {/* A "layout route" is a good place to put markup you want to
          share across all the pages on your site, like navigation. */}
            <nav>
                <ul style={{backgroundColor: "gray"}}>
                    <li>
                        <Link to="/">Home</Link>
                    </li>
                    <li>
                        <Link to="/about">About</Link>
                    </li>
                    <li>
                        <Link to="/conditionmap">ConditionMap</Link>
                    </li>

                </ul>
            </nav>

    {/* An <Outlet> renders whatever child route is currently active,
          so you can think about this <Outlet> as a placeholder for
          the child routes we defined above. */}
    <Outlet />
    </div>
);
}

export default basicNavigationBar