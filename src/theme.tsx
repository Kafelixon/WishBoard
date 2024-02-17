import { extendTheme } from "@mui/joy/styles";

export const theme = extendTheme({
  cssVarPrefix: "bs",
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: "#BFBED5",
          100: "#AAAAC7",
          200: "#9695BA",
          300: "#8181AC",
          400: "#399394",
          500: "#6D6C9F",
          600: "#5D5C8D",
          700: "#4F4F78",
          800: "#424164",
          900: "#34344F",
        },
        neutral: {
          plainColor: "var(--light-font-color)",
          50: "#f1eeec",
          100: "#BFBED5",
          200: "#BFBED5",
          300: "#BFBED5",
          400: "#9c8171",
          500: "#8a6a57",
          600: "#7d604f",
          700: "#2E2D45",
          800: "var(--light-font-color)",
          900: "#4e3830",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          100: "#185654",
          200: "#1b6664",
          300: "#1e7574",
          400: "#208180",
          500: "#399394",
          600: "#5aa4a6",
          700: "#88bdbf",
          900: "#88BDBF",
        },
        neutral: {
          outlinedColor: "var(--dark-font-color)",
          outlinedHoverColor: "var(--dark-font-color)",
          outlinedActiveBg: "#545454",
          plainColor: "var(--dark-font-color)",
          50: "#c6b6ae",
          100: "#5e463b",
          200: "#5e463b",
          // 200: '#646464',
          300: "#7d604f",
          400: "#8a6a57",
          500: "#9c8171",
          600: "#8c807a",
          700: "#c6b6ae",
          800: "#545454",
          900: "#242424",
        },
        text: {
          primary: "var(--dark-font-color)",
          secondary: "var(--dark-font-color)",
        },
        background: {
          surface: "#242424",
        },
      },
    },
  },
});
