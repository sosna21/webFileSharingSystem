import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { NotFoundComponent } from './shared/not-found/not-found.component';
import { HomeComponent } from './features/disc-pages/home/home.component';
import { RegisterComponent } from './features/authentication/register/register.component';
import { SharedWithMeComponent } from './features/disc-pages/shared-with-me/shared-with-me.component';
import { SharedByMeComponent } from './features/disc-pages/shared-by-me/shared-by-me.component';
import { FavouriteComponent } from './features/disc-pages/favourite/favourite.component';
import { RecentComponent } from './features/disc-pages/recent/recent.component';
import { SidebarLayoutComponent } from './shared/layout/sidebar-layout/sidebar-layout.component';
import { PlainLayoutComponent } from './shared/layout/plain-layout/plain-layout.component';
import { SettingsComponent } from './features/settings/settings.component';
import { ProfileComponent } from './features/profile/profile.component';
import { LoginComponent } from './features/authentication/login/login.component';
import { AuthenticatedShellComponent } from './core/shells/authenticated-shell/authenticated-shell.component';

export const routes: Routes = [
  { path: '', redirectTo: 'disc/home', pathMatch: 'full' },

  // UNAUTHENTICATED
  {
    path: '',
    component: PlainLayoutComponent,
    children: [
      {
        path: 'login',
        component: LoginComponent,
        canActivate: [noAuthGuard],
        title: $localize`SignIn`,
      },
      {
        path: 'register',
        component: RegisterComponent,
        canActivate: [noAuthGuard],
        title: $localize`SignUp`,
      },
    ],
  },

  // AUTHENTICATED
  {
    path: '',
    component: AuthenticatedShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'disc',
        component: SidebarLayoutComponent,
        children: [
          { path: '', redirectTo: 'home', pathMatch: 'full' },
          {
            path: 'home',
            component: HomeComponent,
            title: $localize`My files`,
            children: [
              {
                path: 'folder/:dirId',
                component: HomeComponent,
                title: $localize`My files`,
              },
            ],
          },
          {
            path: 'shared-by-me',
            component: SharedByMeComponent,
            title: $localize`Shared by me`,
          },
          {
            path: 'favourite',
            component: FavouriteComponent,
            title: $localize`Favourite`,
          },
          {
            path: 'recent',
            component: RecentComponent,
            title: $localize`Recent`,
          },
          {
            path: 'shared-with-me',
            component: SharedWithMeComponent,
            title: $localize`Shared with me`,
            children: [
              {
                path: 'folder/:dirId',
                component: SharedWithMeComponent,
                title: $localize`Shared with me`,
              },
            ],
          },
        ],
      },
      {
        path: '',
        component: PlainLayoutComponent,
        children: [
          {
            path: 'settings',
            component: SettingsComponent,
            title: $localize`User settings`,
          },
          {
            path: 'profile',
            component: ProfileComponent,
            title: $localize`User profile`,
          },
        ],
      },
    ],
  },

  // 404
  {
    path: '**',
    component: PlainLayoutComponent,
    children: [
      {
        path: '',
        component: NotFoundComponent,
        title: $localize`Page not found`,
      },
    ],
  },
];
