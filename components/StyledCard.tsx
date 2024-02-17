// StyledCard.tsx
import Card from "@mui/joy/Card";
import { SxProps } from "@mui/system";

interface StyledCardProps {
  children: React.ReactNode;
  sx?: SxProps;
}

const StyledCard = (props: StyledCardProps) => (
  <Card
    variant="outlined"
    sx={{
      // width: { xs: 300, sm: "auto" },
      // minWidth: 400,
      alignItems: "center",
      maxWidth: "80vw",
      flexGrow: 1,
      boxSizing: "border-box",
      // Glassmorphism properties
      backgroundColor: "rgba(255, 255, 255, 0.4)", // semi-transparent white
      backdropFilter: "blur(10px)", // blur effect
      borderRadius: "10px", // rounded corners
      border: "1px solid rgba(255, 255, 255, 0.2)", // light border
      boxShadow: "0 8px 32px 0 rgba(31, 38, 31, 0.17)", // shadow
      ...props.sx,
    }}
  >
    {props.children}
  </Card>
);

export default StyledCard;
