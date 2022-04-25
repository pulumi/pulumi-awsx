import { getSubnetSpecs } from "./subnetDistributor";

describe("getSubnetSpecs", () => {
   it("should return a private /19 and public /20 with no parameters", () => {
       const azs = ["us-east-1a", "us-east-1b", "us-east-1c"];
       const result = getSubnetSpecs("10.0.0.0/16", azs);

       expect(result).toEqual([
           {
               type: "Private",
               cidrBlock: "10.0.0.0/19",
               azName: "us-east-1a",
           },
           {
               type: "Private",
               cidrBlock: "10.0.64.0/19",
               azName: "us-east-1b",
           },
           {
               type: "Private",
               cidrBlock: "10.0.128.0/19",
               azName: "us-east-1c",
           },
           {
               type: "Public",
               cidrBlock: "10.0.32.0/20",
               azName: "us-east-1a",
           },
           {
               type: "Public",
               cidrBlock: "10.0.96.0/20",
               azName: "us-east-1b",
           },
           {
               type: "Public",
               cidrBlock: "10.0.160.0/20",
               azName: "us-east-1c",
           },
       ]);
   });
});
