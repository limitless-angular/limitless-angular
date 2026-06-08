export type { VisualEditingNode } from '../types';
export type {
  DocumentSchema,
  HistoryRefresh,
  HistoryUpdate,
  PreviewSnapshot,
  ResolvedSchemaTypeMap,
  SanityNode,
  SanityStegaNode,
  SchemaArrayItem,
  SchemaArrayNode,
  SchemaBooleanNode,
  SchemaInlineNode,
  SchemaNode,
  SchemaNullNode,
  SchemaNumberNode,
  SchemaObjectField,
  SchemaObjectNode,
  SchemaStringNode,
  SchemaType,
  SchemaUnionNode,
  SchemaUnionNodeOptions,
  SchemaUnionOption,
  SchemaUnknownNode,
  TypeSchema,
  UnresolvedPath,
  VisualEditingControllerMsg,
  VisualEditingNodeMsg,
} from '@sanity/presentation-comlink';
export type {
  DocumentsGet,
  DocumentsMutate,
  OptimisticDocument,
  OptimisticDocumentPatches,
  OptimisticReducer,
  OptimisticReducerAction,
  Path,
  PathValue,
} from './types';
export {
  actor,
  emptyActor,
  isEmptyActor,
  listeners,
  setActor,
  type EmptyActor,
  type MutatorActor,
} from './context';
export {
  createDatasetMutator,
  type DatasetMutatorMachineInput,
} from './state/dataset-mutator';
export { createDocumentMutator } from './state/document-mutator';
