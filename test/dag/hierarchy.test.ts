import { dagHierarchy } from "../../src";

const tail = { id: "d" } as const;
const square = {
  id: "a",
  children: [
    {
      id: "b",
      children: [tail]
    },
    {
      id: "c",
      children: [tail]
    }
  ]
} as const;

interface SimpleDatum {
  readonly id: string;
  readonly children?: readonly SimpleDatum[];
}

function typedChildren(datum: SimpleDatum): readonly SimpleDatum[] | undefined {
  return datum.children;
}

test("dagHierarchy() parses minimal dag", () => {
  const single = { id: "a" };

  const layout = dagHierarchy().children(typedChildren);
  expect(layout.children()).toBe(typedChildren);
  expect(layout.childrenData()(single, 0)).toHaveLength(0);
  const dag = layout(single);
  expect(dag.size()).toBeCloseTo(1);
  const [root] = dag.iroots();
  expect(root).toBe(dag);
  expect(root.data.id).toBe("a");
});

test("dagHierarchy() parses a simple square", () => {
  const dag = dagHierarchy().children(typedChildren)(square);
  const [root] = dag.iroots();
  expect(root).toBe(dag);
  expect(root.data.id).toBe("a");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
});

test("dagHierarchy() parses simple vee", () => {
  const dag = dagHierarchy()(...square.children);
  expect(dag.size()).toBeCloseTo(3);
  const [left, right] = dag.iroots();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
});

interface ComplexDatum {
  c?: [ComplexDatum, string][];
}

test("dagHierarchy() works with custom operators", () => {
  const t: ComplexDatum = {};
  const s: ComplexDatum = {
    c: [
      [
        {
          c: [[t, "b -> d"]]
        },
        "a -> b"
      ],
      [
        {
          c: [[t, "c -> d"]]
        },
        "a -> c"
      ]
    ]
  };

  function newChildData(
    d: ComplexDatum
  ): readonly (readonly [ComplexDatum, string])[] | undefined {
    return d.c;
  }

  const layout = dagHierarchy().childrenData(newChildData);
  expect(layout.children().wrapped).toBe(newChildData);
  expect(layout.childrenData()).toBe(newChildData);
  expect(layout.children()(s, 0)).toHaveLength(2);
  expect(layout.children()(t, 4)).toHaveLength(0);

  const dag = layout(s);
  expect(dag.size()).toBeCloseTo(4);
});

test("dagHierarchy() fails with empty data", () => {
  expect(() => dagHierarchy()()).toThrow("must pass in at least one node");
});

test("dagHierarchy() fails with invalid root", () => {
  const input = { id: "1", children: [{ id: "2" }] };
  expect(() => dagHierarchy()(input, ...input.children)).toThrow(
    /node '{"id":"1",.*}' pointed to a root/
  );
});

interface Loop {
  id: string;
  children: Loop[];
}

test("dagHierarchy() fails with cycle", () => {
  const selfLoop: Loop = { id: "2", children: [] };
  selfLoop.children.push(selfLoop);
  const line = {
    id: "1",
    children: [selfLoop]
  };
  expect(() => dagHierarchy()(line)).toThrow(
    /cycle: '{"id":"2",.*}' -> '{"id":"2",.*}'/
  );
});

test("dagHierarchy() fails with hard cycle", () => {
  const loop: Loop = {
      id: "3",
      children: [
        {
          id: "4",
          children: []
        }
      ]
    },
    roota = {
      id: "1",
      children: loop.children.slice()
    },
    rootb = {
      id: "2",
      children: [loop]
    };
  loop.children[0].children.push(loop);
  expect(() => dagHierarchy()(roota, rootb)).toThrow(
    /cycle: '{"id":"4",.*}' -> '{"id":"3",.*}' -> '{"id":"4",.*}'/
  );
});

test("dagHierarchy() throws for nonempty input", () => {
  expect(() => {
    // @ts-expect-error testing javascript failure case
    dagHierarchy(undefined);
  }).toThrow("got arguments to dagHierarchy");
});

class BadChildren {
  id = "";
  get children() {
    throw new Error("bad children");
  }
}

test("dagHierarchy() fails with incorrect children", () => {
  expect(() => dagHierarchy()(new BadChildren())).toThrow(
    "default children function expected datum to have a children field but got: "
  );
});
