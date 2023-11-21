import React, {useEffect, useState} from 'react';
import "../css/PhotoScrollComponent.css";

interface PhotoScrollComponentProps {
    initialIndex: number;
    imageUrls: string[];
    fetchImages: (direction: 'left' | 'right', index: number) => Promise<string[]>; // Updated type
}

const PhotoScrollComponent: React.FC<PhotoScrollComponentProps> = ({ initialIndex, imageUrls }) => {
    const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
    const [displayedImages, setDisplayedImages] = useState<string[]>([]);

    // Update displayed images
    const updateDisplayedImages = () => {
        if (imageUrls.length > 0) {
            const prevIndex = Math.max(0, currentIndex - 1);
            const nextIndex = Math.min(imageUrls.length - 1, currentIndex + 1);
            setDisplayedImages([
                imageUrls[prevIndex],
                imageUrls[currentIndex],
                imageUrls[nextIndex]
            ]);
        }
    };

    // Call updateDisplayedImages when currentIndex changes or imageUrls array changes
    useEffect(() => {
        updateDisplayedImages();
    }, [currentIndex, imageUrls]);

    // Scroll logic
    const scrollImages = (direction: 'left' | 'right') => {
        setCurrentIndex(prevIndex => {
            if (direction === 'right') {
                return prevIndex < imageUrls.length - 1 ? prevIndex + 1 : prevIndex;
            } else {
                return prevIndex > 0 ? prevIndex - 1 : prevIndex;
            }
        });
    };


    return (
        <div className="photo-scroll-container">
            <button className="scroll-button left" onClick={() => scrollImages('left')}>
                &#10094; {/* Left arrow symbol */}
            </button>
            <div className="image-container">
                {displayedImages.map((url, index) => (
                    <img key={index} src={url} className={`road-image ${index === 1 ? 'main-image' : ''}`} alt="Road segment" />
                ))}
            </div>
            <button className="scroll-button right" onClick={() => scrollImages('right')}>
                &#10095; {/* Right arrow symbol */}
            </button>
        </div>
    );
};

export default PhotoScrollComponent;
