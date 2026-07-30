import { Alert as RNAlert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

/**
 * Drop-in replacement for RN's `Alert.alert`. react-native-web's Alert.alert
 * is a total no-op (`static alert() {}`) — it shows nothing AND never calls
 * any button's onPress, so any web flow that waits on a button press (e.g.
 * navigating after a confirmation) silently hangs. This reimplements the same
 * two-button confirm pattern with window.alert/confirm on web, and delegates
 * straight to the real native Alert everywhere else.
 */
function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const text = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // window.confirm only has OK/Cancel — map the 'cancel'-style button to
  // Cancel and treat any other button as the confirming action.
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmBtn = buttons.find((b) => b !== cancelBtn) ?? buttons[0];
  if (window.confirm(text)) confirmBtn.onPress?.();
  else cancelBtn?.onPress?.();
}

export const Alert = { alert };
