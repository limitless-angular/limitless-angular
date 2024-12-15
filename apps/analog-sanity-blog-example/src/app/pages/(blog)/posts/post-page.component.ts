import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { demo } from '@/analog-sanity-blog-example/sanity';

import { type LoadResult } from './[slug].server';
import { RouterLink } from '@angular/router';
import { CoverImageComponent } from '../components/cover-image';
import { FooterComponent } from '../components/footer.component';
import { MoreStoriesComponent } from '../components/more-stories.component';
import { AvatarComponent } from '../components/avatar.component';
import { DateComponent } from '../components/date.component';
import { PortableTextComponent } from '../components/portable-text.component';

@Component({
  selector: 'blog-post-page',
  template: `
    @let post = data().post;
    @let settings = data().settings;
    <div class="container mx-auto px-5">
      <h2
        class="mb-16 mt-10 text-2xl font-bold leading-tight tracking-tight md:text-4xl md:tracking-tighter"
      >
        <a routerLink="/" class="hover:underline">
          {{ settings?.title || demo.title }}
        </a>
      </h2>
      <article>
        <h1
          class="text-balance mb-12 text-6xl font-bold leading-tight tracking-tighter md:text-7xl md:leading-none lg:text-8xl"
        >
          {{ post?.title }}
        </h1>
        <div class="hidden md:mb-12 md:block">
          @if (post?.author; as author) {
            <blog-avatar [name]="author.name" [picture]="author.picture" />
          }
        </div>
        <div class="mb-8 sm:mx-0 md:mb-16">
          <blog-cover-image [image]="post?.coverImage" priority />
        </div>
        <div class="mx-auto max-w-2xl">
          <div class="mb-6 block md:hidden">
            @if (post?.author; as author) {
              <blog-avatar [name]="author.name" [picture]="author.picture" />
            }
          </div>
          <div class="mb-6 text-lg">
            <div class="mb-4 text-lg">
              @if (post?.date; as date) {
                <blog-date [dateString]="date" />
              }
            </div>
          </div>
        </div>
        @if (post?.content?.length) {
          <blog-portable-text
            class="mx-auto max-w-2xl"
            [value]="$any(post!.content)"
          />
        }
      </article>
      <aside>
        <hr class="border-accent-2 mb-24 mt-28" />
        <h2
          class="mb-8 text-6xl font-bold leading-tight tracking-tighter md:text-7xl"
        >
          Recent Stories
        </h2>
        <blog-more-stories [moreStories]="$any(data().morePosts)" />
      </aside>
    </div>
    <footer blog-footer [footer]="data().settings?.footer"></footer>
  `,
  imports: [
    RouterLink,
    PortableTextComponent,
    CoverImageComponent,
    FooterComponent,
    MoreStoriesComponent,
    AvatarComponent,
    DateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostPageComponent {
  slug = input.required<string>();

  data = input.required<LoadResult>();

  protected readonly demo = demo;
}
