import ky from "ky";

// Match a strict ISO-8601 timestamp like "2024-04-29T12:34:56.789Z" or with a
// numeric timezone offset. Display strings such as "08:30 PM" or "Yesterday"
// must NOT match — otherwise React renders an Invalid Date object and crashes.
const ISO_DATE_RE =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

const kyInstance = ky.create({
    parseJson: (text) =>
        JSON.parse(text, (key, value) => {
            if (
                typeof value === "string" &&
                key.endsWith("At") &&
                ISO_DATE_RE.test(value)
            ) {
                return new Date(value);
            }
            return value;
        }),
});

export default kyInstance;
