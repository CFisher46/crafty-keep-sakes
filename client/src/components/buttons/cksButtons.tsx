import { Button } from "grommet";
import { buttonStyles } from "../../helpers/formatting";

interface CksButtonProps {
  name?: string;
  label?: string;
  status?: string;
  onClick?: () => void;
  style?: React.CSSProperties | undefined;
  type?: "button" | "submit" | "reset" | undefined;
}

const CksButton: React.FC<CksButtonProps> = ({
  label,
  onClick,
  status,
  style,
  type,
  name
}) => {
  return (
    <Button
      name={name}
      label={label}
      type={type}
      onClick={onClick}
      disabled={!status}
      primary={true}
      style={buttonStyles.default}
    />
  );
};

export default CksButton;
