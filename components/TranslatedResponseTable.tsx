import Table from "@mui/joy/Table";
import Sheet from "@mui/joy/Sheet";
import Checkbox from "@mui/joy/Checkbox";
import { ResponseData } from "../src/types";

interface TranslatedResponseTableProps {
  response: {
    data: ResponseData[];
  };
  isEditMode?: boolean;
  selectedRecords?: string[];
  onSelectRecord?: (recordId: string) => void;
}

export default function TranslatedResponseTable({
  response,
  isEditMode = false,
  selectedRecords = [],
  onSelectRecord,
}: TranslatedResponseTableProps) {
  const handleSelectAllRecords = () => {
    if (onSelectRecord) {
      if (selectedRecords.length === response.data.length) {
        // Deselect all records
        selectedRecords.forEach((recordId) => onSelectRecord(recordId));
      } else {
        // Select all records
        response.data.forEach((row) => onSelectRecord(row.original_text));
      }
    }
  };

  const tableHeaderStyle = {
    verticalAlign: "middle",
    borderRadius: 0,
  };

  return (
    <Sheet sx={{ overflow: "auto" }}>
      <Table aria-label="translated text table" stickyHeader hoverRow>
        <thead>
          <tr>
            {isEditMode && (
              <th style={{ ...tableHeaderStyle, width: 30 }}>
                <Checkbox
                  sx={{ p: "5px" }}
                  checked={selectedRecords.length === response.data.length}
                  onChange={handleSelectAllRecords}
                />
              </th>
            )}
            <th style={{ ...tableHeaderStyle, width: 100 }}>Occurrences</th>
            <th style={{ ...tableHeaderStyle }}>Original Text</th>
            <th style={{ ...tableHeaderStyle }}>Translated Text</th>
          </tr>
        </thead>
        <tbody>
          {response &&
            response.data.map((row) => (
              <tr key={row.original_text}>
                {isEditMode && (
                  <td>
                    <Checkbox
                      sx={{ p: "5px" }}
                      checked={selectedRecords.includes(row.original_text)}
                      onChange={() =>
                        onSelectRecord && onSelectRecord(row.original_text)
                      }
                    />
                  </td>
                )}
                <td>{row.occurrences}</td>
                <td>{row.original_text}</td>
                <td>{row.translated_text}</td>
              </tr>
            ))}
        </tbody>
      </Table>
    </Sheet>
  );
}
