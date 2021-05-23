import { dagConnect } from "../../src/";

interface ComplexLinkDatum {
  source: string;
  target: string;
}

const simpleSquare = [
  ["a", "b"],
  ["a", "c"],
  ["b", "d"],
  ["c", "d"]
] as const;
const simpleVee = [
  ["a", "c"],
  ["b", "c"]
] as const;
const complexSquare: ComplexLinkDatum[] = [
  { source: "a", target: "b" },
  { source: "a", target: "c" },
  { source: "b", target: "d" },
  { source: "c", target: "d" }
];

const zherebko = [
  ["1", "2"],
  ["1", "5"],
  ["1", "7"],
  ["2", "3"],
  ["2", "4"],
  ["2", "5"],
  ["2", "7"],
  ["2", "8"],
  ["3", "6"],
  ["3", "8"],
  ["4", "7"],
  ["5", "7"],
  ["5", "8"],
  ["5", "9"],
  ["6", "8"],
  ["7", "8"],
  ["9", "10"],
  ["9", "11"]
] as const;

test("dagConnect() parses a simple square", () => {
  const dag = dagConnect()(simpleSquare);
  expect(dag.size()).toBeCloseTo(4);
  const [root] = dag.iroots();
  expect(root.data.id).toBe("a");
  const [left, right] = root.ichildren();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
  expect([
    ["a", "b", "c", "d"],
    ["a", "c", "b", "d"]
  ]).toContainEqual([...dag.idescendants("before").map((n) => n.data.id)]);
});

test("dagConnect() handles single nodes", () => {
  expect(() =>
    dagConnect()([
      ["b", "a"],
      ["a", "a"]
    ])
  ).toThrow("cycle");

  const build = dagConnect().single(true);
  expect(build.single()).toBeTruthy();

  const dag = build([["a", "a"]]);
  expect(dag.size()).toBeCloseTo(1);
  const ids = [...dag.idescendants("before").map((n) => n.data.id)];
  expect(ids).toEqual(["a"]);
});

test("dagConnect() parses a more complex square", () => {
  function newSource(datum: ComplexLinkDatum): string {
    return datum.source;
  }
  function newTarget(datum: ComplexLinkDatum): string {
    return datum.target;
  }

  const layout = dagConnect().sourceId(newSource).targetId(newTarget);
  expect(layout.sourceId()).toBe(newSource);
  expect(layout.targetId()).toBe(newTarget);

  // @ts-expect-error can't widen type
  layout.sourceId((src: string): string => src);

  const dag = layout(complexSquare);
  expect(dag.size()).toBeCloseTo(4);
});

test("dagConnect() parses vee", () => {
  const dag = dagConnect()(simpleVee);
  expect(dag.size()).toBeCloseTo(3);
  expect(dag.roots()).toHaveLength(2);
});

test("dagConnect() parses zherebko", () => {
  const dag = dagConnect()(zherebko);
  expect(dag.size()).toBeCloseTo(11);
});

test("dagConnect() fails on empty", () => {
  expect(() => dagConnect()([])).toThrow("can't connect empty data");
});

test("dagConnect() fails passing an arg to dagConnect", () => {
  // @ts-expect-error testing javascript failure case
  expect(() => dagConnect(null)).toThrow("got arguments to dagConnect");
});

test("dagConnect() fails with no roots", () => {
  const cycle = [
    ["a", "b"],
    ["b", "a"]
  ];
  expect(() => dagConnect()(cycle)).toThrow("dag contained no roots");
});

test("dagConnect() fails with cycle", () => {
  const cycle = [
    ["c", "a"],
    ["a", "b"],
    ["b", "a"]
  ];
  expect(() => dagConnect()(cycle)).toThrow(
    `cycle: '{"id":"a"}' -> '{"id":"b"}' -> '{"id":"a"}'`
  );
});

class BadZero {
  get ["0"]() {
    throw new Error("bad zero");
  }
  ["1"] = "a";
}

test("dagConnect() fails on non-string source", () => {
  expect(() => dagConnect()([[null, "a"]])).toThrow(
    "default source id expected datum[0] to be a string but got datum: "
  );
  expect(() => dagConnect()([new BadZero()])).toThrow(
    "default source id expected datum[0] to be a string but got datum: "
  );
});

class BadOne {
  ["0"] = "a";
  get ["1"]() {
    throw new Error("bad one");
  }
}

test("dagConnect() fails on non-string target", () => {
  expect(() => dagConnect()([["a", null]])).toThrow(
    "default target id expected datum[1] to be a string but got datum: "
  );
  expect(() => dagConnect()([new BadOne()])).toThrow(
    "default target id expected datum[1] to be a string but got datum: "
  );
});

test("dagConnect() fails on duplicate edges", () => {
  expect(() =>
    dagConnect()([
      ["a", "b"],
      ["a", "b"]
    ])
  ).toThrow("contained duplicate children");
});
