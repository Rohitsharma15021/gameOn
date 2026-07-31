import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  visible: boolean;
  value: Date;
  minimumDate: Date;
  onChange: (date: Date) => void;
  onRequestClose: () => void;
}

export function DateField({ visible, value, minimumDate, onChange, onRequestClose }: Props) {
  if (!visible) return null;
  return (
    <DateTimePicker
      value={value}
      mode="date"
      minimumDate={minimumDate}
      onChange={(_, selected) => {
        onRequestClose();
        if (selected) onChange(selected);
      }}
    />
  );
}
