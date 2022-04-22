import { countDefined } from "./utils";

describe("countDefined", () => {
    test("none", () => {
        expect(countDefined([])).toBe(0);
    });
    test("undefined", () => {
        expect(countDefined([undefined])).toBe(0);
    });
    test("null", () => {
        expect(countDefined([null])).toBe(0);
    });
    test("object", () => {
        expect(countDefined([{}])).toBe(1);
    });
    test("zero", () => {
        expect(countDefined([0])).toBe(1);
    });
});
