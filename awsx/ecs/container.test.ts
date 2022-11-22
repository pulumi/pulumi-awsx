import { getMappingInputs } from "./containers";

describe("port mappings", () => {
  it.each`
    tgDefault    | containerIn  | hostIn       | containerOut | hostOut
    ${undefined} | ${undefined} | ${3}         | ${3}         | ${3}
    ${undefined} | ${2}         | ${undefined} | ${2}         | ${2}
    ${undefined} | ${2}         | ${3}         | ${2}         | ${3}
    ${1}         | ${undefined} | ${undefined} | ${1}         | ${1}
    ${1}         | ${undefined} | ${3}         | ${3}         | ${3}
    ${1}         | ${2}         | ${undefined} | ${2}         | ${1}
    ${1}         | ${2}         | ${3}         | ${2}         | ${3}
  `(
    "picks correct default for $tgDefault, $containerIn, $hostIn",
    ({ tgDefault, containerIn, hostIn, containerOut, hostOut }) => {
      const inputs = getMappingInputs({ containerPort: containerIn, hostPort: hostIn }, tgDefault);
      expect(inputs).toMatchObject({ containerPort: containerOut, hostPort: hostOut });
    },
  );
});
