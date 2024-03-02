// StyledStack.tsx
import Stack from "@mui/joy/Stack";
import { SxProps } from "@mui/system";

interface StyledStackProps {
  children: React.ReactNode;
  sx?: SxProps;
}

const StyledStack = (props: StyledStackProps) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={{ xs: 1, sm: 2, md: 4, pt: 7 }}
    marginX={{ xs: 5, sm: 20, md: 50, pt: 100 }}
    justifyContent="center"
    alignItems="center"
    mt={12}
    mb={6}
    sx={{
      ...props.sx,
    }}
  >
    {props.children}
  </Stack>
);

export default StyledStack;
