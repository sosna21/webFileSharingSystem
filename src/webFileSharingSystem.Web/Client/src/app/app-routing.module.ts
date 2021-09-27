import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './Components/login/login.component';
import {AuthGuard} from "./guards/auth.guard";
import {HomeComponent} from "./Components/home/home.component";
import {FavouritePageComponent} from "./Components/favourite-page/favourite-page.component";
import {FileExplorerComponent} from "./Components/file-explorer/file-explorer.component";
import {RecentComponent} from "./Components/recent/recent.component";
import {TagsComponent} from "./Components/tags/tags.component";
import {DeletedComponent} from "./Components/deleted/deleted.component";
import {RegisterComponent} from "./Components/register/register.component";
import {FilesComponent} from "./Components/files/files.component";


const routes: Routes = [
  {
    path: '',
    runGuardsAndResolvers: "always",
    canActivate: [AuthGuard],
    children: [
      {path: '', component: HomeComponent },
      { path: 'files', component: FilesComponent },
      { path: 'favourite', component: FavouritePageComponent },
      { path: 'recent', component: RecentComponent },
      { path: 'tags', component: TagsComponent },
      { path: 'deleted', component: DeletedComponent },
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
