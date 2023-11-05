import React, { useState } from 'react';
import "../css/PhotoScrollComponent.css";

interface PhotoScrollComponentProps {
    imageUrls: string[];
    fetchAdjacentImages: (direction: 'left' | 'right', index: number) => Promise<string[]>;
}

const PhotoScrollComponent: React.FC<PhotoScrollComponentProps> = ({ imageUrls, fetchAdjacentImages }) => {
    const [currentImages, setCurrentImages] = useState<string[]>(imageUrls);
    // Starting index for the main image, this needs to be updated as you scroll
    const [currentIndex, setCurrentIndex] = useState<number>(3); // assuming the 4th image is the main one

    const scrollImages = async (direction: 'left' | 'right') => {
        let newImages: string[]; // Explicitly type newImages as an array of strings
        let newIndex: number;

        if (direction === 'right') {
            newIndex = currentIndex + 1; // Increase the index to move to the right
            newImages = await fetchAdjacentImages(direction, newIndex);
            // Assuming the new image is at the end of the array
            setCurrentImages(prevImages => [...prevImages.slice(1), ...newImages.slice(-1)]);
        } else {
            newIndex = currentIndex - 1; // Decrease the index to move to the left
            newImages = await fetchAdjacentImages(direction, newIndex);
            // Assuming the new image is at the start of the array
            setCurrentImages(prevImages => [...newImages.slice(0, 1), ...prevImages.slice(0, -1)]);
        }

        setCurrentIndex(newIndex);
    };


    return (
        <div className="photo-scroll-container">
            <button className="scroll-button left" onClick={() => scrollImages('left')}>
                &#10094; {/* Left arrow symbol */}
            </button>
            <div className="image-container">
                {currentImages.map((url, index) => (
                    <img key={index} src={url} className={`road-image ${index === 3 ? 'main-image' : ''}`} alt="Road segment" />
                ))}
            </div>
            <button className="scroll-button right" onClick={() => scrollImages('right')}>
                &#10095; {/* Right arrow symbol */}
            </button>
        </div>
    );
};

export default PhotoScrollComponent;
