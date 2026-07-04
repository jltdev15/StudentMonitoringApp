import type {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

export const toDateString = (date: Date = new Date()) =>
  date.toISOString().slice(0, 10);

export const toReadableDate = (
  value?: Date | FirebaseFirestoreTypes.Timestamp | null | string,
) => {
  if (!value) {
    return 'No date';
  }
  const date =
    typeof value === 'string'
      ? new Date(value)
      : 'toDate' in value
      ? value.toDate()
      : value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const toMonthKey = (date: Date = new Date()) =>
  date.toISOString().slice(0, 7);
