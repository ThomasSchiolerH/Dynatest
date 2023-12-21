import React, {useEffect, useState} from 'react';
import '../css/SearchBar.css';
import {get} from "../queries/fetch";
import {useData, useRoadHighlight } from "../context/RoadDataContext";

/**
 * @author Thomas Schioler Hansen (s214968)
 * @interface
 * */
type Coordinates = {
    lat: number;
    lng: number
};

/**
 * @author Thomas Schioler Hansen (s214968)
 * @interface
 * */
type GeoReference = {
    road_name: string;
    coordinates: Coordinates
};

/**
 * @author Thomas Schioler Hansen (s214968)
 * */
const SearchBar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [geoReferences, setGeoReferences] = useState<GeoReference[]>([]);
    const { map } = useData();
    const { highlightRoad } = useRoadHighlight(); // Use useRoadHighlight here

    let zoomLevel = 15; // Set zoom for when search for road is moving map

    const SearchIcon = () => {
        return (
            <div className="search-icon-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" style={{ fill: 'rgba(105, 105, 105, 1)' }}>
                    <path d="M19.023 16.977a35.13 35.13 0 0 1-1.367-1.384c-.372-.378-.596-.653-.596-.653l-2.8-1.337A6.962 6.962 0 0 0 16 9c0-3.859-3.14-7-7-7S2 5.141 2 9s3.14 7 7 7c1.763 0 3.37-.66 4.603-1.739l1.337 2.8s.275.224.653.596c.387.363.896.854 1.384 1.367l1.358 1.392.604.646 2.121-2.121-.646-.604c-.379-.372-.885-.866-1.391-1.36zM9 14c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z"></path>
                </svg>
                <span className="search-tooltip">Search</span>
            </div>
        );
    };

    const CloseIcon = () => {
        return (
            <div className="close-icon-container">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    style={{
                        fill: "rgba(119, 118, 118, 0.72)",
                        transform: "scaleY(-1)",
                        msFilter: "progid:DXImageTransform.Microsoft.BasicImage(rotation=2, mirror=1)"
                    }}
                >
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm4.207 12.793-1.414 1.414L12 13.414l-2.793 2.793-1.414-1.414L10.586 12 7.793 9.207l1.414-1.414L12 10.586l2.793-2.793 1.414 1.414L13.414 12l2.793 2.793z"></path>
                </svg>
            </div>
        );
    };

    /**
    * @author Thomas Schioler Hansen (s214968)
    * @dependencies {Array} - Depends on changes in the searchQuery.
    * @output {void} - No return value. The effect potentially updates the state with geo-references.
    * @errorHandling Logs errors to the console if they occur during the fetch process.
    */
    useEffect(() => {
        if(searchQuery.trim().length === 0) return;

        get("/conditions/road-names?name=" + searchQuery, (geoRefCollection: GeoReference[]) => {
            try {
                const geoReferences: GeoReference[] = geoRefCollection.map((reference : GeoReference) => reference);
                setGeoReferences(geoReferences);
            } catch (e) {
                console.error(e);
            }
        });
    }, [searchQuery]);

    /**
     * @author Thomas Schioler Hansen (s214968)
     * @param {React.ChangeEvent<HTMLInputElement>} event - The input change event.
     * @output {void} - No return value. Updates the searchQuery state.
     * */
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const userInput : string = event.target.value;
        setSearchQuery(userInput);
    };

    /**
     * @author Thomas Schioler Hansen (s214968)
     * @param {string} name - The string to be converted to title case.
     * @output {string} - The converted title case string.
     * */
    const toTitleCase = (name: string) => {
        return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    /**
     * @author Thomas Schioler Hansen (s214968)
     * @param {React.FormEvent<HTMLFormElement>} event - The form submission event.
     * @output {void} - No return value. Executes a search with the formatted query.
     * */
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formattedQuery = toTitleCase(searchQuery);
        executeSearch(formattedQuery);
        highlightRoad(formattedQuery);
    };

    /**
     * @author Thomas Schioler Hansen (s214968)
     * @param {string} query - The search query.
     * @output {void} - No return value. Performs a search and updates the map view.
     * */
    const executeSearch = (query: string) => {
        try {
            //console.log("Searching for:", query);
            fetchRoadCoordinates(query, (coordinates) => {
                if (coordinates) {
                    //console.log("Coordinates received:", coordinates);
                    panToMapCoordinates(coordinates);
                    setGeoReferences([]);
                } else {
                    console.error("Coordinates not found for the road:", query);
                }
            });
        } catch (error) {
            console.error("Error executing search:", error);
        }
    };


    /**
     * @author Thomas Schioler Hansen (s214968)
     * @param {string} suggestion - The clicked suggestion.
     * @output {void} - No return value. Updates the search query and executes a search.
     * */
    const handleSuggestionClick = (suggestion: string) => {
        setSearchQuery(suggestion);
        executeSearch(suggestion);
        highlightRoad(suggestion);

        console.log(suggestion)
    };

    /**
     * @author Thomas Schioler Hansen (s214968)
     * @param {string} roadName - The name of the road.
     * @param {(coords: { lat: number, lng: number }) => void} callback - Callback function to execute with the coordinates.
     * @output {void} - No return value. Executes the callback with the road coordinates.
     * */

    const fetchRoadCoordinates = (roadName: string, callback: (coords: { lat: number, lng: number }) => void) => {
        const i: number = geoReferences.findIndex((e : GeoReference) : boolean => e.road_name === roadName);
        callback(geoReferences[i].coordinates);
    };

    /**
     * @author Thomas Schioler Hansen (s214968)
     * @param {{ lat: number, lng: number }} coords - The coordinates to pan to.
     * @output {void} - No return value. Adjusts the map view.
     * */
    const panToMapCoordinates = (coords: { lat: number, lng: number }) => {
        if (map) {
            map.flyTo(coords, zoomLevel);
        }
    };

/**
 * @author Thomas Schioler Hansen (s214968)
 * @output {void} - No return value. Resets the searchQuery state.
 * */

 const handleReset = () => {
        setSearchQuery('');
    };

    /**
     * @author Thomas Schioler Hansen (s214968)
     * @output Returns the search bar component
     * */
    return (
        <form className="form" onSubmit={handleSubmit} onReset={handleReset}>
            <button type="submit" className="search-button">
                <SearchIcon />
            </button>
            <input
                className="input"
                placeholder="Search"
                required
                title="Search for a road name."
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
            />
            {searchQuery && geoReferences.length > 0 && (
                <ul className="suggestions">
                    {geoReferences.map((ref, index) => (
                        <li key={index} onClick={() => handleSuggestionClick(ref.road_name)}>
                            {ref.road_name}
                        </li>
                    ))}
                </ul>
            )}
            <button className="reset" type="reset">
                <CloseIcon />
            </button>
        </form>
    );
};

export default SearchBar;