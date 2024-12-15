import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type LoadResult } from './(home).server';
import { FooterComponent } from './components/footer.component';
import { OnboardingComponent } from './components/onboarding.component';
import { MoreStoriesComponent } from './components/more-stories.component';
import { PortableTextComponent } from './components/portable-text.component';
import { RouterLink } from '@angular/router';
import { CoverImageComponent } from './components/cover-image';
import { DateComponent } from './components/date.component';
import { AvatarComponent } from './components/avatar.component';
import { demo } from '@/analog-sanity-blog-example/sanity';

@Component({
  selector: 'blog-intro',
  imports: [PortableTextComponent],
  template: `
    <section
      class="mt-16 mb-16 flex flex-col items-center lg:mb-12 lg:flex-row lg:justify-between"
    >
      <h1
        class="text-balance text-6xl font-bold leading-tight tracking-tighter lg:pr-8 lg:text-8xl"
      >
        {{ title() || demo.title }}
      </h1>
      <h2 class="text-pretty mt-5 text-center text-lg lg:pl-8 lg:text-left">
        <blog-portable-text class="prose-lg" [value]="descriptionToUse()" />
      </h2>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroComponent {
  title = input<string | null | undefined>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  description = input<any>();

  protected readonly demo = demo;

  descriptionToUse = computed(() =>
    this.description()?.length ? this.description() : demo.description,
  );
}

@Component({
  selector: 'blog-hero-post',
  imports: [RouterLink, CoverImageComponent, DateComponent, AvatarComponent],
  template: `
    <article>
      <a [routerLink]="['/posts', slug()]" class="group mb-8 block md:mb-16">
        <blog-cover-image [image]="coverImage()" [priority]="true" />
      </a>
      <div class="mb-20 md:mb-28 md:grid md:grid-cols-2 md:gap-x-16 lg:gap-x-8">
        <div>
          <h3 class="text-pretty mb-4 text-4xl leading-tight lg:text-6xl">
            <a [routerLink]="['/posts', slug()]" class="hover:underline">
              {{ title() }}
            </a>
          </h3>
          <div class="mb-4 text-lg md:mb-0">
            <blog-date [dateString]="date()" />
          </div>
        </div>
        <div>
          @if (excerpt()) {
            <p class="text-pretty mb-4 text-lg leading-relaxed">
              {{ excerpt() }}
            </p>
          }
          @if (author()) {
            <blog-avatar [name]="author().name" [picture]="author().picture" />
          }
        </div>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroPostComponent {
  title = input.required<string>();
  slug = input.required<string | null>();
  excerpt = input<string | null>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coverImage = input.required<any>();
  date = input.required<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  author = input<any>();
}

@Component({
  selector: 'blog-home-page',
  imports: [
    IntroComponent,
    HeroPostComponent,
    OnboardingComponent,
    MoreStoriesComponent,
    FooterComponent,
  ],
  template: `
    <div class="container mx-auto px-5">
      <blog-intro
        [title]="settings()?.title"
        [description]="settings()?.description"
      />
      @if (heroPost(); as post) {
        <blog-hero-post
          [title]="post.title"
          [slug]="post.slug"
          [coverImage]="post.coverImage"
          [excerpt]="post.excerpt"
          [date]="post.date"
          [author]="post.author"
        />
      } @else {
        <blog-onboarding />
      }
      @if (heroPost()?._id) {
        <aside>
          <h2
            class="mb-8 text-6xl font-bold leading-tight tracking-tighter md:text-7xl"
          >
            More Stories
          </h2>
          <blog-more-stories [moreStories]="posts()" />
        </aside>
      }
    </div>
    <footer blog-footer [footer]="settings().footer"></footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  data = input.required<LoadResult>();

  settings = computed(() => this.data().settings);
  posts = computed(() => this.data().posts.slice(1));
  heroPost = computed(() => this.data().posts.at(0));
}
