export const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const required = (value: string, label: string) =>
  value.trim().length === 0 ? `${label} is required.` : null;

export const toNumberOrZero = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
