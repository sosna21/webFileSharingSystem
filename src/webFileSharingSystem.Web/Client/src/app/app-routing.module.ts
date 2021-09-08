import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './Components/login/login.component';
import {HomeComponent} from "./Components/home/home.component";
import {FavouritePageComponent} from "./Components/favourite-page/favourite-page.component";
import {FileExplorerComponent} from "./Components/file-explorer/file-explorer.component";
import {RecentComponent} from "./Components/recent/recent.component";
import {TagsComponent} from "./Components/tags/tags.component";
import {DeletedComponent} from "./Components/deleted/deleted.component";


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'files', component: FileExplorerComponent },
  { path: 'favourite', component: FavouritePageComponent },
  { path: 'recent', component: RecentComponent },
  { path: 'tags', component: TagsComponent },
  { path: 'deleted', component: DeletedComponent },
  { path: '**', component: LoginComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
