import Autocomplete from '@mui/joy/Autocomplete';
import AutocompleteOption from '@mui/joy/AutocompleteOption';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';

export type SelectorOption = { code: string; label: string };

type OnChangeCallback = (value: string) => void;

interface SelectorProps {
    label: string;
    options: Array<SelectorOption>;
    onChange: OnChangeCallback;
}

export default function Selector({ label, options, onChange }: SelectorProps) {
    return (
        <FormControl
        ><div>
                <FormLabel>{label}</FormLabel>
                <Autocomplete
                    autoHighlight
                    isOptionEqualToValue={(option, value) => option.code === value.code}
                    defaultValue={options[0]}
                    options={options}
                    onChange={(_event, newValue) => {
                        if (newValue !== null) {
                            onChange(newValue.code);
                        }
                    }}
                    renderOption={(optionProps, option) => (
                        <AutocompleteOption {...optionProps} sx={{ color: "inherit", ":hover": { color: "inherit" } }}>
                            {option.label.charAt(0).toUpperCase() + option.label.slice(1)}
                        </AutocompleteOption>
                    )}
                    slotProps={{
                        input: {
                            autoComplete: 'new-password', // disable autocomplete and autofill
                        },
                    }}
                />
            </div>
        </FormControl>
    );
}
