import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './Components/login/login.component';
import {AuthGuard} from "./guards/auth.guard";
import {HomeComponent} from "./Components/home/home.component";
import {FavouritePageComponent} from "./Components/favourite-page/favourite-page.component";
import {RecentComponent} from "./Components/recent/recent.component";
import {TagsComponent} from "./Components/tags/tags.component";
import {DeletedComponent} from "./Components/deleted/deleted.component";
import {RegisterComponent} from "./Components/register/register.component";
import {FilesComponent} from "./Components/files/files.component";
import {SharedWithMeComponent} from "./Components/shared-with-me/shared-with-me.component";
import {SharedByMeComponent} from "./Components/shared-by-me/shared-by-me.component";


const routes: Routes = [
  {
    path: '',
    runGuardsAndResolvers: "always",
    canActivate: [AuthGuard],
    children: [
      {path: '', component: HomeComponent },
      { path: 'files', component: FilesComponent },
      { path: 'files/:id', component: FilesComponent },
      { path: 'favourite', component: FavouritePageComponent },
      { path: 'recent', component: RecentComponent },
      { path: 'tags', component: TagsComponent },
      { path: 'deleted', component: DeletedComponent },
      { path: 'shared-with-me', component: SharedWithMeComponent },
      { path: 'shared-by-me', component: SharedByMeComponent },
    ]
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent},
  { path: '**', component: LoginComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
