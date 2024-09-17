import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { MoreStoriesQueryResult } from '@/analog-sanity-blog-example/sanity';
import { CoverImageComponent } from './cover-image';
import { AvatarComponent } from './avatar.component';
import { DateComponent } from './date.component';

@Component({
  selector: 'more-stories',
  standalone: true,
  imports: [RouterLink, CoverImageComponent, AvatarComponent, DateComponent],
  template: `
    <div
      class="mb-32 grid grid-cols-1 gap-y-20 md:grid-cols-2 md:gap-x-16 md:gap-y-32 lg:gap-x-32"
    >
      @for (post of moreStories(); track post._id) {
        <article>
          <a [routerLink]="'/posts/' + post.slug" class="group mb-5 block">
            <cover-image [image]="post.coverImage" />
          </a>
          <h3 class="text-balance mb-3 text-3xl leading-snug">
            <a [routerLink]="'/posts/' + post.slug" class="hover:underline">
              {{ post.title }}
            </a>
          </h3>
          <div class="mb-4 text-lg">
            <date-component [dateString]="post.date" />
          </div>
          @if (post.excerpt) {
            <p class="text-pretty mb-4 text-lg leading-relaxed">
              {{ post.excerpt }}
            </p>
          }
          @if (post.author; as author) {
            <avatar [name]="author.name" [picture]="author.picture" />
          }
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoreStoriesComponent {
  moreStories = input<
    MoreStoriesQueryResult,
    MoreStoriesQueryResult | undefined
  >([], { transform: (data) => data ?? [] });
}
