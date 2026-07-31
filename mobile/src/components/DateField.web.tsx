import { colors, radius, spacing } from '../theme/theme';

interface Props {
  visible: boolean;
  value: Date;
  minimumDate: Date;
  onChange: (date: Date) => void;
  onRequestClose: () => void;
}

/**
 * Web build of the date picker. @react-native-community/datetimepicker has
 * no web target (it renders null there) — see DateField.native.tsx for the
 * real native picker. This sibling file (picked by Metro for
 * platform === 'web') uses a plain HTML date input instead.
 */
export function DateField({ visible, value, minimumDate, onChange, onRequestClose }: Props) {
  if (!visible) return null;
  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <input
      type="date"
      autoFocus
      value={toStr(value)}
      min={toStr(minimumDate)}
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange(new Date(`${v}T00:00:00`));
        onRequestClose();
      }}
      onBlur={onRequestClose}
      style={{
        marginTop: spacing.sm,
        padding: 10,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        fontSize: 14,
        fontFamily: 'inherit',
        color: colors.text,
      }}
    />
  );
}
