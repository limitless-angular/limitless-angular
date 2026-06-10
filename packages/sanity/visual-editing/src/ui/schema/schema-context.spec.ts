import { describe, expect, test } from 'vitest';

import { createSchemaContext } from './schema-context';

describe('createSchemaContext', () => {
  test('resolves a keyed union array item to its union option field', () => {
    const context = createSchemaContext(
      [
        {
          fields: {
            body: {
              name: 'body',
              type: 'objectField',
              value: {
                of: {
                  of: [
                    {
                      name: 'block',
                      title: 'Block',
                      type: 'unionOption',
                      value: {
                        fields: {},
                        type: 'object',
                      },
                    },
                  ],
                  type: 'union',
                },
                type: 'array',
              },
            },
          },
          name: 'post',
          type: 'document',
        },
      ] as never,
      new Map([['post-id', new Map([['body[_key=="block-key"]', 'block']])]]),
    );

    const { field, parent } = context.getField({
      id: 'post-id',
      path: 'body[_key=="block-key"]',
      type: 'post',
    } as never);

    expect(field?.type).toBe('unionOption');
    expect(field?.name).toBe('block');
    expect(parent?.type).toBe('union');
  });
});
