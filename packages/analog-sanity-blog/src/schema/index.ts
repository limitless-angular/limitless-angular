import { defineArrayMember, defineField, defineType } from 'sanity';

const linkAnnotation = defineField({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'href',
      title: 'URL',
      type: 'url',
      validation: (rule) => rule.required(),
    }),
  ],
});

export const imageWithAltType = defineType({
  name: 'imageWithAlt',
  title: 'Image',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Short description for screen readers and fallback text.',
    }),
  ],
});

export const openGraphImageType = defineType({
  name: 'openGraphImage',
  title: 'Open Graph image',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
    }),
    defineField({
      name: 'metadataBase',
      title: 'Metadata base URL',
      type: 'url',
      description: 'Optional absolute base URL used when resolving social images.',
    }),
  ],
});

export const simpleBlockContentType = defineType({
  name: 'simpleBlockContent',
  title: 'Simple block content',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{ title: 'Normal', value: 'normal' }],
      marks: {
        annotations: [linkAnnotation],
      },
    }),
  ],
});

export const blockContentType = defineType({
  name: 'blockContent',
  title: 'Block content',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Heading 1', value: 'h1' },
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
        { title: 'Heading 4', value: 'h4' },
        { title: 'Heading 5', value: 'h5' },
        { title: 'Heading 6', value: 'h6' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bullet', value: 'bullet' },
        { title: 'Number', value: 'number' },
      ],
      marks: {
        annotations: [linkAnnotation],
      },
    }),
  ],
});

export const authorType = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'picture',
      title: 'Picture',
      type: 'imageWithAlt',
    }),
  ],
  preview: {
    select: {
      media: 'picture',
      title: 'name',
    },
  },
});

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'imageWithAlt',
    }),
    defineField({
      name: 'date',
      title: 'Published date',
      type: 'datetime',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      media: 'coverImage',
      subtitle: 'slug.current',
      title: 'title',
    },
  },
});

export const settingsType = defineType({
  name: 'settings',
  title: 'Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'simpleBlockContent',
    }),
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'blockContent',
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph image',
      type: 'openGraphImage',
    }),
  ],
});

export const schemaTypes = [
  authorType,
  blockContentType,
  imageWithAltType,
  openGraphImageType,
  postType,
  settingsType,
  simpleBlockContentType,
];
