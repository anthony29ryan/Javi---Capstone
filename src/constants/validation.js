// The design's email check: something@something.tld, with at least two letters
// after the last dot. Only a first pass; Firebase still has the final say.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
