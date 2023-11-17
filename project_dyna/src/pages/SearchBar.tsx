import React, {useEffect, useState} from 'react';
import '../css/SearchBar.css';
import {get} from "../queries/fetch";

interface RoadNames {
    success: boolean;
    roads: { way_name: string }[];
}

const SearchBar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    //const [roadNames, setRoadNames] = useState<string[]>([]);
    const mockRoadNames = ['Main Street', 'Elm Street', 'Oak Avenue', 'Maple Lane', 'Pine Road', 'Lyngby Hovedgade']
    const [roadNames] = useState<string[]>(mockRoadNames); // Use mock data
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);;

    const SearchIcon = () => {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style={{ fill: 'rgba(0, 0, 0, 1)' }}>
                <path d="M19.023 16.977a35.13 35.13 0 0 1-1.367-1.384c-.372-.378-.596-.653-.596-.653l-2.8-1.337A6.962 6.962 0 0 0 16 9c0-3.859-3.14-7-7-7S2 5.141 2 9s3.14 7 7 7c1.763 0 3.37-.66 4.603-1.739l1.337 2.8s.275.224.653.596c.387.363.896.854 1.384 1.367l1.358 1.392.604.646 2.121-2.121-.646-.604c-.379-.372-.885-.866-1.391-1.36zM9 14c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z"></path>
            </svg>
        );
    };

    const CloseIcon = () => {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{
                    fill: "rgba(119, 118, 118, 0.72)",
                    transform: "scaleY(-1)",
                    msFilter: "progid:DXImageTransform.Microsoft.BasicImage(rotation=2, mirror=1)"
                }}
            >
                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm4.207 12.793-1.414 1.414L12 13.414l-2.793 2.793-1.414-1.414L10.586 12 7.793 9.207l1.414-1.414L12 10.586l2.793-2.793 1.414 1.414L13.414 12l2.793 2.793z"></path>
            </svg>
        );
    };
    // useEffect(() => {
    //     // Fetch road names when the component mounts
    //     get("/conditions/road_names", (data: RoadNamesResponse) => {
    //         if (data.success) {
    //             // Extract way_name from each road and update the state
    //             const names = data.roads.map(road => road.way_name);
    //             setRoadNames(names);
    //         }
    //     });
    // }, []);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const userInput = event.target.value;
        setSearchQuery(userInput);

        const filtered = roadNames.filter(
            name => name.toLowerCase().includes(userInput.toLowerCase())
        );
        setFilteredSuggestions(filtered);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Add search functionality here
        console.log("Searching for:", searchQuery);
    };

    const handleReset = () => {
        setSearchQuery('');
    };

    return (
        <form className="form" onSubmit={handleSubmit} onReset={handleReset}>
            <button type="submit" className="search-button">
                <SearchIcon />
            </button>
            <input
                className="input"
                placeholder="Search"
                required
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
            />
            {searchQuery && filteredSuggestions.length > 0 && (
                <ul className="suggestions">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li key={index} onClick={() => setSearchQuery(suggestion)}>
                            {suggestion}
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