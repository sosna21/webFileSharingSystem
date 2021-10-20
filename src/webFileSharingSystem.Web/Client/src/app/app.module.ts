import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FontAwesomeModule, FaIconLibrary} from '@fortawesome/angular-fontawesome';
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {NavbarComponent} from './Components/navbar/navbar.component';
import {SidebarComponent} from './Components/sidebar/sidebar.component';
import {LoginComponent} from './Components/login/login.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import {FileExplorerComponent} from './Components/file-explorer/file-explorer.component';
import {HomeComponent} from './Components/home/home.component';
import {FavouritePageComponent} from './Components/favourite-page/favourite-page.component';
import {RecentComponent} from './Components/recent/recent.component';
import {TagsComponent} from './Components/tags/tags.component';
import {DeletedComponent} from './Components/deleted/deleted.component';
import {RegisterComponent} from './Components/register/register.component';
import {TextInputComponent} from './Components/common/text-input/text-input.component';
import {JwtInterceptor} from "./interceptors/jwt.interceptor";
import {FileUploadModule} from "ng2-file-upload";
import {PaginationModule} from "ngx-bootstrap/pagination";
import {TimeagoModule} from 'ngx-timeago';
import {PopoverModule} from "ngx-bootstrap/popover";
import {BsDropdownModule} from "ngx-bootstrap/dropdown";
import {MimeFontawesomePipe} from "./Components/common/MimeFontawesomePipe";
import {FileUploadComponent} from './Components/file-upload/file-upload.component';
import { FilesComponent } from './Components/files/files.component';
import {ModalModule} from "ngx-bootstrap/modal";
import {SizeConverterPipe} from "./Components/common/sizeConverterPipe";
import {SharedWithMeComponent} from './Components/shared-with-me/shared-with-me.component';
import {SharedByMeComponent} from './Components/shared-by-me/shared-by-me.component';
import {DndDirective} from './Components/file-upload/directive/dnd.directive';
import {DurationPickerModule} from "ngx-duration-picker";
import {ToastrModule} from "ngx-toastr";
import {ButtonsModule} from "ngx-bootstrap/buttons";

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    SidebarComponent,
    LoginComponent,
    FileExplorerComponent,
    HomeComponent,
    FavouritePageComponent,
    RecentComponent,
    TagsComponent,
    DeletedComponent,
    RegisterComponent,
    TextInputComponent,
    MimeFontawesomePipe,
    FileUploadComponent,
    FilesComponent,
    SizeConverterPipe,
    SharedWithMeComponent,
    SharedByMeComponent,
    SizeConverterPipe,
    DndDirective

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    FontAwesomeModule,
    CollapseModule.forRoot(),
    FileUploadModule,
    PaginationModule.forRoot(),
    FormsModule,
    TimeagoModule.forRoot(),
    PopoverModule,
    BsDropdownModule.forRoot(),
    ModalModule.forRoot(),
    DurationPickerModule,
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right'
    }),
    ButtonsModule,

  ],
  providers: [
    {provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true},
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIconPacks(fas, far);
  }
}

