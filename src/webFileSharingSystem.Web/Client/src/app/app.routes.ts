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

export const routes: Routes = [
    { path: '', redirectTo: 'disc/home', pathMatch: 'full' },
    {
        path: 'disc',
        component: SidebarLayoutComponent,
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', component: HomeComponent, title: 'My files' },
            { path: 'shared-with-me', component: SharedWithMeComponent, title: 'Shared with me' },
            { path: 'shared-by-me', component: SharedByMeComponent, title: 'Shared by me' },
            { path: 'favourite', component: FavouriteComponent, title: 'Favourite' },
            { path: 'recent', component: RecentComponent, title: 'Recent' },
        ],
        canActivate: [authGuard],
    },
    {
        path: '',
        component: PlainLayoutComponent,
        children: [
            { path: 'login', component: LoginComponent, canActivate: [noAuthGuard], title: 'SignIn' },
            { path: 'register', component: RegisterComponent, canActivate: [noAuthGuard], title: 'SignUp' },
            { path: 'settings', component: SettingsComponent, canActivate: [authGuard], title: 'User settings' },
            { path: 'profile', component: ProfileComponent, canActivate: [authGuard], title: 'User profile' },
            { path: '**', component: NotFoundComponent, title: 'Page not found' },
        ],
    },
];
