import React, { useState } from "react";
import {
  Textarea,
  Button,
  FormControl,
  Typography,
  Stack,
  Slider,
  FormLabel,
} from "@mui/joy";
import axios from "axios";
// import { auth } from "../src/firebaseSetup";
import { API_URL } from "../config";
// import { saveToUserWishlist } from "../data/userWishlist";
import StyledCard from "../components/StyledCard";
import DropZone from "../components/DropZone";
import LanguageSelector from "../components/LanguageSelector";
import { PossibleTranslationLanguages } from "../data/PossibleTranslationLanguages";
import ToggleGroup from "../components/ToggleGroup";
import WishlistTable from "../components/WishlistTable";

interface APIResponse {
  data: any;
}

export const TranslationView: React.FC = () => {
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [textOrFile, setTextOrFile] = useState<string>("text");
  const [text, setText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [inputLanguage, setInputLanguage] = useState<string>("auto");
  const [outputLanguage, setOutputLanguage] = useState<string>("en");
  const [minWordSize, setMinWordSize] = useState<number>(2);
  const [minAppearances, setMinAppearances] = useState<number>(1);

  const [loading, setLoading] = useState(false);
  // const userId = auth.currentUser?.uid;

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (
        (textOrFile === "text" && text === "") ||
        (textOrFile === "file" && file === null)
      ) {
        throw new Error("Please provide input text or select a file");
      }
      const formData = new FormData();
      formData.append("subs_language", inputLanguage);
      formData.append("target_language", outputLanguage);
      formData.append("min_word_size", minWordSize.toString());
      formData.append("min_appearance", minAppearances.toString());

      if (textOrFile === "text") {
        formData.append("text", text);
      } else if (file !== null) {
        formData.append("file", file);
      }
      if (API_URL === undefined) {
        throw new Error("API_URL not defined");
      }
      const res = await axios.post(API_URL, formData);
      console.log(res);

      setResponse(res);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === " ERR_NETWORK") {
          alert("The backend server is not running.");
        } else {
          console.log("this" + error);
        }
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // const handleSaveToWishlist = () => {
  //   if (response && userId) {
  //     saveToUserWishlist(userId, response.data).then(() => {
  //       alert("Saved to user wishlist!");
  //     });
  //   }
  // };

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={{ xs: 1, sm: 2, md: 4, pt: 7 }}
      justifyContent="center"
      alignItems="center"
      mt={12}
      marginX={{ xs: 2, sm: 4, md: 8 }}
    >
      <StyledCard>
        <Typography
          level="h1"
          fontWeight="xl"
          textAlign="center"
          sx={{ mb: 4, mt: 1 }}
        >
          Translate
        </Typography>
        <FormControl sx={{ flex: 1, gap: 1, width: 300 }}>
          <ToggleGroup
            label="Input Type"
            options={[
              { label: "Text", value: "text" },
              { label: "File", value: "file" },
            ]}
            onChange={(value) => {
              setTextOrFile(value);
            }}
          />
          {textOrFile === "text" ? (
            <Textarea
              placeholder="Enter text here"
              defaultValue="Try to put text longer than 4 lines."
              sx={{ height: 132 }}
              onChange={(event) => {
                setText(event.target.value);
              }}
            />
          ) : (
            <DropZone
              onDrop={(files) => {
                setFile(files[0]);
              }}
              sx={{ height: 132 }}
            />
          )}
          <LanguageSelector
            label="Input Language"
            options={[
              { code: "auto", label: "Auto" },
              ...PossibleTranslationLanguages,
            ]}
            onChange={(value) => {
              setInputLanguage(value);
            }}
          />
          <LanguageSelector
            label="Output Language"
            options={PossibleTranslationLanguages}
            onChange={(value) => {
              setOutputLanguage(value);
            }}
          />
          <div>
            <FormLabel sx={{ mb: 0, mt: 1 }}>Minimum Word Size</FormLabel>
            <Slider
              aria-label="Minimum Word Size"
              defaultValue={2}
              onChange={(_e, value) => {
                if (typeof value === "number") {
                  setMinWordSize(value);
                }
              }}
              step={1}
              min={1}
              max={20}
              valueLabelDisplay="auto"
              sx={{ p: 0 }}
            />
          </div>
          <div>
            <FormLabel sx={{ mb: 0, mt: 1 }}>Minimum Appearances</FormLabel>
            <Slider
              aria-label="Minimum Appearances"
              defaultValue={1}
              onChange={(_e, value) => {
                if (typeof value === "number") {
                  setMinAppearances(value);
                }
              }}
              step={1}
              min={1}
              max={20}
              valueLabelDisplay="auto"
              sx={{ p: 0 }}
            />
          </div>

          <Button loading={loading} onClick={handleSubmit} sx={{ mt: 2 }}>
            Submit
          </Button>
        </FormControl>
      </StyledCard>
      {response && (
        <StyledCard>
          <WishlistTable response={response} />
          {/* <Button onClick={handleSaveToWishlist} sx={{ mt: 2, width: 300 }}>
            Save to Wishlist
          </Button> */}
        </StyledCard>
      )}
    </Stack>
  );
};
