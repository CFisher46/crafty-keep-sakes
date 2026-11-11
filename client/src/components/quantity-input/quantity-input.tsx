import { Text } from 'grommet';
import { parseQuantity } from '../../helpers/quantity';
import { ui } from '../../helpers/theme';

interface QuantityInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}

function QuantityInput({ label, value, onChange, onBlur, disabled }: QuantityInputProps) {
  const invalid = parseQuantity(value) === null;
  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        aria-invalid={invalid}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        style={{ width: 72, padding: 6, border: `1px solid ${ui.line}`, color: ui.ink, textAlign: 'center' }}
      />
      {invalid && (
        <Text size="small" color="status-critical" role="alert">
          Enter a whole number between 1 and 2147483647.
        </Text>
      )}
    </div>
  );
}

export default QuantityInput;
