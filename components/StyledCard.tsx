// StyledCard.tsx
import Card from "@mui/joy/Card";

interface StyledCardProps {
  children: React.ReactNode;
}

const StyledCard = (props: StyledCardProps) => (
  <Card
    variant="outlined"
    sx={{
      boxShadow: 2,
      width: { xs: 300, sm: "auto" },
      alignItems: "center",
      maxWidth: "80vw",
      maxHeight: "80vh",
      flexGrow: 1,
      boxSizing: "border-box",
    }}
  >
    {props.children}
  </Card>
);

export default StyledCard;
