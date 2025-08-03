import { Button } from "grommet";

interface CksButtonProps {
  label: string;
  status?: string;
  onClick?: () => void;
  style?: React.CSSProperties | undefined;
}

const CksButton: React.FC<CksButtonProps> = ({
  label,
  onClick,
  status,
  style
}) => {
  return (
    <Button
      label={label}
      onClick={onClick}
      disabled={!status}
      primary={true}
      style={style}
    />
  );
};

export default CksButton;
