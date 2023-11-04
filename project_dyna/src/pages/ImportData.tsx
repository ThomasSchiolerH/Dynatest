import React, {useState} from 'react';
import "../css/ImportData.css";

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
            <path d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 15.4806 20.1956 16.8084 19 17.5M7 10C4.79086 10 3 11.7909 3 14C3 15.4806 3.8044 16.8084 5 17.5M7 10C7.43285 10 7.84965 10.0688 8.24006 10.1959M12 12V21M12 12L15 15M12 12L9 15" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        </g>
    </svg>
);

const FileIcon = () => (
    <svg fill="#000000" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
            <path d="M15.331 6H8.5v20h15V14.154h-8.169z"></path>
            <path d="M18.153 6h-.009v5.342H23.5v-.002z"></path>
        </g>
    </svg>
);

const DeleteIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '48px', height: '48' }}>
        {/* SVG paths */}
        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
            <path d="M5.16565 10.1534C5.07629 8.99181 5.99473 8 7.15975 8H16.8402C18.0053 8 18.9237 8.9918 18.8344 10.1534L18.142 19.1534C18.0619 20.1954 17.193 21 16.1479 21H7.85206C6.80699 21 5.93811 20.1954 5.85795 19.1534L5.16565 10.1534Z" stroke="#000000" strokeWidth="2"></path>
            <path d="M19.5 5H4.5" stroke="#000000" strokeWidth="2" strokeLinecap="round"></path>
            <path d="M10 3C10 2.44772 10.4477 2 11 2H13C13.5523 2 14 2.44772 14 3V5H10V3Z" stroke="#000000" strokeWidth="2"></path>
        </g>
    </svg>
);

// Define the type for the file state
type FileOrNull = File | null;

const ImportData = (props: any) => {
    // Additional logic or state can be added here
    const [selectedFile, setSelectedFile] = useState<FileOrNull>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('File selected:', file); // Debugging: check the console to see if this logs correctly
        setSelectedFile(file ?? null);
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        const fileInput = document.getElementById('file') as HTMLInputElement; // Cast to specific element type
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = () => {
        if (selectedFile) {
            // Process the file submission here
            console.log('Submitting file:', selectedFile.name);
            // TODO: Send the file to the backend here
            // You could send the file to a backend server using fetch or axios, for example.

            // After submission, clear the selected file
            setSelectedFile(null);

            // Reset the input field
            const fileInput = document.getElementById('file') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
        }
    };

    return (
        <div className="importDataContainer"> {/* Use the container class here */}
            <div className="importDataHeader"> {/* Header with the title */}
                Import Data
            </div>

            {/* Radio buttons section */}
            <div className="radioGroup">
                <div>
                    <label>
                        <input type="radio" name="radio" defaultChecked className="radioInput" />
                        <span>KPI</span>
                    </label>
                    <label>
                        <input type="radio" name="radio" className="radioInput" />
                        <span>DI</span>
                    </label>
                    <label>
                        <input type="radio" name="radio" className="radioInput" />
                        <span>IRI</span>
                    </label>
                    <label>
                        <input type="radio" name="radio" className="radioInput" />
                        <span>Mu</span>
                    </label>
                    <label>
                        <input type="radio" name="radio" className="radioInput" />
                        <span>E_norm</span>
                    </label>
                </div>
            </div>

            {/* The import UI */}
            <div className="importUIcontainer" style={{ backgroundColor: 'white' }}>
                <div className="importUIheader">
                    <label htmlFor="file" className="importUIheaderLabel">
                        <UploadIcon />
                        <p>Browse File to upload!</p>
                    </label>
                </div>
                <label htmlFor="file" className="importUIfooter">
                    <FileIcon />
                    <p>{selectedFile ? selectedFile.name : "No selected file"}</p>
                    <button onClick={clearSelectedFile} style={{ border: 'none', background: 'none' }}>
                        <DeleteIcon />
                    </button>
                </label>
                <input id="file" type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                {/* Submit Button */}
                <button onClick={handleSubmit} className="submitButton">
                    Submit File
                </button>
            </div>
        </div>
    );

}

export default ImportData;
