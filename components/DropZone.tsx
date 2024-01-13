import { Typography, Box } from '@mui/joy';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DragEvent, useState } from 'react';
import { styled } from '@mui/joy/styles';

const Root = styled("div")(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderColor: theme.vars.palette.neutral.outlinedBorder + ' !important',
    border: 'solid 1px',
    '&:hover': {
        borderColor: theme.vars.palette.neutral.outlinedHoverBorder,
    },
}));

interface DropZoneProps {
    onDrop: (files: File[]) => void;
    sx?: any;
}

export default function DropZone({ onDrop }: DropZoneProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        setSelectedFile(files[0]);
        onDrop(files);
    };

    return (
        <Root
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ cursor: 'pointer' }}
            sx={{ height: 132, maxWidth: 300, boxSizing: 'border-box' }}
        >
            <input
                type="file"
                id="fileInput"
                style={{ display: 'none' }}
                onChange={(e) => {
                    if (e.target.files !== null && e.target.files[0] !== undefined) {
                        console.log(e.target.files[0]);
                        const filesArray = Array.from(e.target.files);
                        onDrop(filesArray);
                        setSelectedFile(filesArray[0]);
                    }
                }}
            />

            <label htmlFor="fileInput">
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                    gap={1}
                    style={{ cursor: 'pointer' }}
                >
                    <CloudUploadIcon fontSize="large" />{selectedFile ? (
                        <Typography>
                            Selected File:<br />
                            {selectedFile.name}
                        </Typography>
                    ) : (
                        <Typography >
                            Drag and drop a file here or click to select a file
                        </Typography>
                    )}
                </Box>
            </label>
        </Root>
    );
}