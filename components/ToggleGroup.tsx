import * as React from 'react';
import FormLabel from '@mui/joy/FormLabel';
import Button from '@mui/joy/Button';
import ToggleButtonGroup from '@mui/joy/ToggleButtonGroup';

type Option = {
    label: React.ReactNode;
    value: string;
};

type OnChangeCallback = (value: string) => void;

type ToggleGroupProps = {
    label: string;
    options: Option[];
    onChange: OnChangeCallback;
};

export default function ToggleGroup({ label, options, onChange }: ToggleGroupProps) {
    const [selectedOption, setSelectedOption] = React.useState(options[0].value);

    return (
        <>
            <FormLabel sx={{ mb: 0, mt: 1 }}>{label}</FormLabel>
            <ToggleButtonGroup
                value={selectedOption}
                onChange={(_event, newValue) => {
                    if (newValue !== null) {
                        setSelectedOption(newValue);
                        onChange(newValue);
                    }
                }}
            >
                {options.map((option) => (
                    <Button key={option.value} value={option.value} sx={{ width: 150 }}>{option.label}</Button>
                ))}
            </ToggleButtonGroup>
        </>
    );
}
