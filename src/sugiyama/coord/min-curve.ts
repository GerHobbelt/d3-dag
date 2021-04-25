/**
 * This accessor positions nodes to minimize the curvature of every line, and
 * the distance between every edge.  This accessor solves a quadratic program
 * (QP) and so may take significant time, especially as the number of nodes
 * grows.
 *
 * It's deprecated as you can get the same layout by passing identical weights
 * to *vertical* and *curve* in [["sugiyama/coord/quad" | Quadratic
 * Optimization ]] accessor.
 *
 * <img alt="min curve example" src="media://min_curve.png" width="400">
 *
 * @deprecated
 * @module
 */
import { HorizableNode, NodeSizeAccessor, Operator } from ".";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { quad } from "./quad";

/**
 * Minimum curves operator.
 * @deprecated
 */
export interface MinCurveOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Set the weight that trades off between distance and curvature. Weight must
   * be a value between 0 includive and 1 exclusive. Higher weights prioritize
   * minimizing curves more, while lower weights prioritize minimizing child
   * closeness. Since minimizing only curves is not well defined, weight can
   * not be 1.
   */
  weight(val: number): MinCurveOperator<NodeType>;
  /** Get the current weight, which defaults to 1/2. */
  weight(): number;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(options: {
  weight: number;
}): MinCurveOperator<NodeType> {
  function minCurveCall(
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    nodeSize: NodeSizeAccessor<NodeType>
  ): number {
    const { weight } = options;
    return quad<NodeType>()
      .vertical([(1 - weight) / 2, (1 - weight) / 2])
      .curve([weight, weight])
      .component(0.5)(layers, nodeSize);
  }

  function weight(): number;
  function weight(val: number): MinCurveOperator<NodeType>;
  function weight(val?: number): number | MinCurveOperator<NodeType> {
    if (val === undefined) {
      return options.weight;
    } else if (val < 0 || val >= 1) {
      throw new Error(`weight must be in [0, 1), but was ${val}`);
    } else {
      return buildOperator({ ...options, weight: val });
    }
  }
  minCurveCall.weight = weight;

  return minCurveCall;
}

/**
 * Create a default [[MinCurveOperator]].
 * @deprecated
 * */
export function minCurve<NodeType extends DagNode>(
  ...args: never[]
): MinCurveOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to minCurve(${args}), but constructor takes no aruguments.`
    );
  }

  return buildOperator({ weight: 0.5 });
}
